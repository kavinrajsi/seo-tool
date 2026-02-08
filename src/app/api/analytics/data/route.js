import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";

async function runReport(accessToken, propertyId, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    return null;
  }

  return res.json();
}

function formatDate30DaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { reportType } = await request.json();

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("ga_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Google Analytics not connected" }, { status: 404 });
  }

  if (!connection.property_id) {
    return NextResponse.json({ error: "No GA4 property selected. Please select a property first." }, { status: 400 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
  }

  const propertyId = connection.property_id;
  const dateRange = { startDate: formatDate30DaysAgo(), endDate: today() };

  if (reportType === "detailed") {
    // 4 parallel requests for detailed view
    const [dailyMetrics, deviceBreakdown, countries, landingPages] = await Promise.all([
      // Daily metrics
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
        ],
        orderBys: [{ dimension: { dimensionName: "date", orderType: "ALPHANUMERIC" }, desc: true }],
        limit: 30,
      }),
      // Device breakdown
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
        ],
      }),
      // Top 20 countries
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "country" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 20,
      }),
      // Top 20 landing pages
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 20,
      }),
    ]);

    return NextResponse.json({
      dailyMetrics: parseRows(dailyMetrics, ["date"], ["sessions", "users", "pageviews", "bounceRate"]),
      deviceBreakdown: parseRows(deviceBreakdown, ["device"], ["sessions", "users", "pageviews"]),
      countries: parseRows(countries, ["country"], ["sessions", "users"]),
      landingPages: parseRows(landingPages, ["page"], ["sessions", "users", "bounceRate", "avgDuration"]),
      dateRange,
    });
  }

  // Default: overview report — 3 parallel requests
  const [summary, topPages, trafficSources] = await Promise.all([
    // Summary metrics
    runReport(accessToken, propertyId, {
      dateRanges: [dateRange],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
        { name: "newUsers" },
      ],
    }),
    // Top 10 pages
    runReport(accessToken, propertyId, {
      dateRanges: [dateRange],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "totalUsers" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
    // Traffic sources
    runReport(accessToken, propertyId, {
      dateRanges: [dateRange],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }),
  ]);

  // Parse summary (single row, no dimensions)
  const summaryRow = summary?.rows?.[0];
  const summaryData = summaryRow
    ? {
        sessions: parseInt(summaryRow.metricValues[0]?.value || "0"),
        users: parseInt(summaryRow.metricValues[1]?.value || "0"),
        pageviews: parseInt(summaryRow.metricValues[2]?.value || "0"),
        bounceRate: parseFloat(summaryRow.metricValues[3]?.value || "0"),
        avgDuration: parseFloat(summaryRow.metricValues[4]?.value || "0"),
        newUsers: parseInt(summaryRow.metricValues[5]?.value || "0"),
      }
    : null;

  return NextResponse.json({
    summary: summaryData,
    topPages: parseRows(topPages, ["page"], ["pageviews", "users", "avgDuration"]),
    trafficSources: parseRows(trafficSources, ["channel"], ["sessions", "users"]),
    dateRange,
  });
}

function parseRows(report, dimKeys, metricKeys) {
  if (!report?.rows) return [];

  return report.rows.map((row) => {
    const obj = {};
    dimKeys.forEach((key, i) => {
      obj[key] = row.dimensionValues[i]?.value || "";
    });
    metricKeys.forEach((key, i) => {
      const val = row.metricValues[i]?.value || "0";
      obj[key] = key === "bounceRate" || key === "avgDuration"
        ? parseFloat(val)
        : parseInt(val);
    });
    return obj;
  });
}

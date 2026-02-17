import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";

async function querySearchAnalytics(accessToken, siteUrl, body) {
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
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
  // GSC data has a ~3 day delay, use 3 days ago as end date
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().split("T")[0];
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
    .from("gsc_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "Search Console not connected" }, { status: 404 });
  }

  if (!connection.property_id) {
    return NextResponse.json({ error: "No site selected. Please select a site first." }, { status: 400 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
  }

  const siteUrl = connection.property_id;
  const startDate = formatDate30DaysAgo();
  const endDate = today();

  if (reportType === "detailed") {
    // 4 parallel requests for detailed view
    const [dailyMetrics, topQueries, topCountries, deviceBreakdown] = await Promise.all([
      // Daily metrics
      querySearchAnalytics(accessToken, siteUrl, {
        startDate,
        endDate,
        dimensions: ["date"],
        rowLimit: 30,
      }),
      // Top 20 queries
      querySearchAnalytics(accessToken, siteUrl, {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 20,
      }),
      // Top 20 countries
      querySearchAnalytics(accessToken, siteUrl, {
        startDate,
        endDate,
        dimensions: ["country"],
        rowLimit: 20,
      }),
      // Device breakdown
      querySearchAnalytics(accessToken, siteUrl, {
        startDate,
        endDate,
        dimensions: ["device"],
      }),
    ]);

    return NextResponse.json({
      dailyMetrics: parseGscRows(dailyMetrics, "date"),
      topQueries: parseGscRows(topQueries, "query"),
      topCountries: parseGscRows(topCountries, "country"),
      deviceBreakdown: parseGscRows(deviceBreakdown, "device"),
      dateRange: { startDate, endDate },
    });
  }

  // Default: overview report — 3 parallel requests
  const [summary, topQueries, topPages] = await Promise.all([
    // Summary totals (no dimensions)
    querySearchAnalytics(accessToken, siteUrl, {
      startDate,
      endDate,
    }),
    // Top 10 queries
    querySearchAnalytics(accessToken, siteUrl, {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 10,
    }),
    // Top 10 pages
    querySearchAnalytics(accessToken, siteUrl, {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 10,
    }),
  ]);

  // Parse summary (single row, no dimensions)
  const summaryRow = summary?.rows?.[0];
  const summaryData = summaryRow
    ? {
        clicks: summaryRow.clicks || 0,
        impressions: summaryRow.impressions || 0,
        ctr: summaryRow.ctr || 0,
        position: summaryRow.position || 0,
      }
    : null;

  return NextResponse.json({
    summary: summaryData,
    topQueries: parseGscRows(topQueries, "query"),
    topPages: parseGscRows(topPages, "page"),
    dateRange: { startDate, endDate },
  });
}

function parseGscRows(report, dimensionKey) {
  if (!report?.rows) return [];

  return report.rows.map((row) => {
    const obj = {};
    if (row.keys && row.keys.length > 0) {
      obj[dimensionKey] = row.keys[0];
    }
    obj.clicks = row.clicks || 0;
    obj.impressions = row.impressions || 0;
    obj.ctr = row.ctr || 0;
    obj.position = row.position || 0;
    return obj;
  });
}

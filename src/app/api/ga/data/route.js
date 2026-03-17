import { NextResponse } from "next/server";
import { google } from "googleapis";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedClient } from "@/lib/google";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, siteUrl, dateRange = "30" } = await req.json();

    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Not connected" }, { status: 403 });
    }

    const origin = new URL(req.url).origin;
    const auth = getAuthenticatedClient(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: tokenRow.expiry_date,
      },
      `${origin}/api/google/callback`
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - Number(dateRange));
    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    let gaData = null;
    let scData = null;

    // ── Google Analytics Data ──────────────────────────────────
    if (propertyId) {
      const analyticsData = google.analyticsdata({ version: "v1beta", auth });

      // Overview metrics
      const overviewRes = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
            { name: "newUsers" },
          ],
        },
      });

      const row = overviewRes.data.rows?.[0]?.metricValues || [];
      const overview = {
        activeUsers: Number(row[0]?.value || 0),
        sessions: Number(row[1]?.value || 0),
        pageViews: Number(row[2]?.value || 0),
        bounceRate: Number(parseFloat(row[3]?.value || 0).toFixed(2)),
        avgSessionDuration: Number(parseFloat(row[4]?.value || 0).toFixed(1)),
        newUsers: Number(row[5]?.value || 0),
      };

      // Top pages
      const pagesRes = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "activeUsers" },
            { name: "averageSessionDuration" },
          ],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 20,
        },
      });

      const topPages = (pagesRes.data.rows || []).map((r) => ({
        path: r.dimensionValues[0].value,
        views: Number(r.metricValues[0].value),
        users: Number(r.metricValues[1].value),
        avgDuration: Number(parseFloat(r.metricValues[2].value).toFixed(1)),
      }));

      // Traffic sources
      const sourcesRes = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [
            { name: "sessions" },
            { name: "activeUsers" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        },
      });

      const trafficSources = (sourcesRes.data.rows || []).map((r) => ({
        channel: r.dimensionValues[0].value,
        sessions: Number(r.metricValues[0].value),
        users: Number(r.metricValues[1].value),
      }));

      // Devices
      const devicesRes = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
      });

      const devices = (devicesRes.data.rows || []).map((r) => ({
        device: r.dimensionValues[0].value,
        sessions: Number(r.metricValues[0].value),
      }));

      // Countries
      const countriesRes = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 10,
        },
      });

      const countries = (countriesRes.data.rows || []).map((r) => ({
        country: r.dimensionValues[0].value,
        users: Number(r.metricValues[0].value),
        sessions: Number(r.metricValues[1].value),
      }));

      // Daily trend
      const trendRes = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
        },
      });

      const dailyTrend = (trendRes.data.rows || []).map((r) => {
        const d = r.dimensionValues[0].value;
        return {
          date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
          users: Number(r.metricValues[0].value),
          sessions: Number(r.metricValues[1].value),
          pageViews: Number(r.metricValues[2].value),
        };
      });

      gaData = { overview, topPages, trafficSources, devices, countries, dailyTrend };
    }

    // ── Search Console Data ────────────────────────────────────
    if (siteUrl) {
      const searchConsole = google.searchconsole({ version: "v1", auth });

      // Top queries
      const queriesRes = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["query"],
          rowLimit: 25,
        },
      });

      const topQueries = (queriesRes.data.rows || []).map((r) => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Number((r.ctr * 100).toFixed(2)),
        position: Number(r.position.toFixed(1)),
      }));

      // Top pages in search
      const scPagesRes = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["page"],
          rowLimit: 20,
        },
      });

      const searchPages = (scPagesRes.data.rows || []).map((r) => ({
        page: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Number((r.ctr * 100).toFixed(2)),
        position: Number(r.position.toFixed(1)),
      }));

      // Device breakdown
      const scDevicesRes = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["device"],
        },
      });

      const searchDevices = (scDevicesRes.data.rows || []).map((r) => ({
        device: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Number((r.ctr * 100).toFixed(2)),
        position: Number(r.position.toFixed(1)),
      }));

      // Country breakdown
      const scCountriesRes = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["country"],
          rowLimit: 10,
        },
      });

      const searchCountries = (scCountriesRes.data.rows || []).map((r) => ({
        country: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Number((r.ctr * 100).toFixed(2)),
        position: Number(r.position.toFixed(1)),
      }));

      // Daily trend
      const scTrendRes = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["date"],
        },
      });

      const searchTrend = (scTrendRes.data.rows || []).map((r) => ({
        date: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Number((r.ctr * 100).toFixed(2)),
        position: Number(r.position.toFixed(1)),
      }));

      scData = { topQueries, searchPages, searchDevices, searchCountries, searchTrend };
    }

    // ── Store in Supabase ──────────────────────────────────────
    const reportRow = {
      user_id: user.id,
      property_id: propertyId || null,
      site_url: siteUrl || null,
      date_range: `${start} to ${end}`,
      ga_data: gaData,
      sc_data: scData,
      fetched_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("ga_reports")
      .insert(reportRow);

    if (insertError) {
      console.error("Failed to store report:", insertError);
    }

    return NextResponse.json({ gaData, scData, dateRange: { start, end } });
  } catch (err) {
    console.error("GA data fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch data" },
      { status: 500 }
    );
  }
}

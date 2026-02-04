import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function refreshAccessToken(admin, connection) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_GSC_CLIENT_ID,
      client_secret: process.env.GOOGLE_GSC_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    return null;
  }

  const tokens = await res.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await admin
    .from("gsc_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

async function findSiteUrl(accessToken, targetUrl) {
  // List all sites the user has access to
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const sites = data.siteEntry || [];

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return null;
  }

  const targetOrigin = parsedTarget.origin + "/";
  const targetDomain = parsedTarget.hostname;

  // Try URL-prefix property first (exact origin match)
  const urlPrefix = sites.find(
    (s) => s.siteUrl === targetOrigin || s.siteUrl === parsedTarget.origin
  );
  if (urlPrefix) return urlPrefix.siteUrl;

  // Try sc-domain: format
  const domainProp = sites.find(
    (s) => s.siteUrl === `sc-domain:${targetDomain}`
  );
  if (domainProp) return domainProp.siteUrl;

  // Try matching root domain (e.g., www.example.com matches sc-domain:example.com)
  const rootDomain = targetDomain.replace(/^www\./, "");
  const rootDomainProp = sites.find(
    (s) => s.siteUrl === `sc-domain:${rootDomain}`
  );
  if (rootDomainProp) return rootDomainProp.siteUrl;

  return null;
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("gsc_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "GSC not connected" }, { status: 404 });
  }

  // Auto-refresh token if expired
  let accessToken = connection.access_token;
  const expiresAt = new Date(connection.token_expires_at);
  if (expiresAt <= new Date(Date.now() + 60000)) {
    accessToken = await refreshAccessToken(admin, connection);
    if (!accessToken) {
      return NextResponse.json({ error: "Token refresh failed. Please reconnect GSC." }, { status: 401 });
    }
  }

  // Find the matching GSC site property
  const siteUrl = await findSiteUrl(accessToken, url);
  if (!siteUrl) {
    return NextResponse.json({
      error: "No matching Search Console property found for this URL.",
      queries: [],
      indexStatus: null,
    });
  }

  // Fetch search analytics (last 28 days, top 25 queries)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 28);

  const formatDate = (d) => d.toISOString().split("T")[0];

  let queries = [];
  try {
    const analyticsRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["query"],
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: "page",
                  operator: "equals",
                  expression: url,
                },
              ],
            },
          ],
          rowLimit: 25,
          dataState: "all",
        }),
      }
    );

    if (analyticsRes.ok) {
      const analyticsData = await analyticsRes.json();
      queries = (analyticsData.rows || []).map((row) => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }));
    }
  } catch {
    // Non-critical — return empty queries
  }

  // Fetch URL inspection / index status
  let indexStatus = null;
  try {
    const inspectRes = await fetch(
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl,
        }),
      }
    );

    if (inspectRes.ok) {
      const inspectData = await inspectRes.json();
      const result = inspectData.inspectionResult?.indexStatusResult;
      if (result) {
        indexStatus = {
          coverageState: result.coverageState || "Unknown",
          indexingState: result.indexingState || "Unknown",
          lastCrawlTime: result.lastCrawlTime || null,
          crawledAs: result.crawledAs || null,
          robotsTxtState: result.robotsTxtState || null,
          pageFetchState: result.pageFetchState || null,
        };
      }
    }
  } catch {
    // Non-critical — return null indexStatus
  }

  return NextResponse.json({
    siteUrl,
    queries,
    indexStatus,
    dateRange: {
      start: formatDate(startDate),
      end: formatDate(endDate),
    },
  });
}

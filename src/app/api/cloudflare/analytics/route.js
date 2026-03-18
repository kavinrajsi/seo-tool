import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 30;

const CF_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

async function cfQuery(apiToken, query, variables) {
  const res = await fetch(CF_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

export async function POST(req) {
  try {
    const { apiToken, zoneId, zoneName, dateRange = "7" } = await req.json();

    if (!apiToken || !zoneId) {
      return NextResponse.json({ error: "API token and zone ID are required" }, { status: 400 });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - Number(dateRange));
    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    // ── Overview: total visits, page views, unique visitors ──────
    const overviewData = await cfQuery(apiToken, `
      query ($zoneTag: string!, $since: string!, $until: string!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            httpRequests1dGroups(
              filter: { date_geq: $since, date_leq: $until }
              limit: 100
              orderBy: [date_ASC]
            ) {
              dimensions { date }
              sum {
                requests
                pageViews
                threats
                bytes
              }
              uniq { uniques }
            }
          }
        }
      }
    `, { zoneTag: zoneId, since: start, until: end });

    const dailyGroups = overviewData.viewer.zones[0]?.httpRequests1dGroups || [];

    const dailyTrend = dailyGroups.map((g) => ({
      date: g.dimensions.date,
      requests: g.sum.requests,
      pageViews: g.sum.pageViews,
      visitors: g.uniq.uniques,
      threats: g.sum.threats,
      bandwidth: g.sum.bytes,
    }));

    const totals = dailyTrend.reduce(
      (acc, d) => ({
        requests: acc.requests + d.requests,
        pageViews: acc.pageViews + d.pageViews,
        visitors: acc.visitors + d.visitors,
        threats: acc.threats + d.threats,
        bandwidth: acc.bandwidth + d.bandwidth,
      }),
      { requests: 0, pageViews: 0, visitors: 0, threats: 0, bandwidth: 0 }
    );

    // ── Top content, countries, browsers, referrers, status codes ──
    const breakdownData = await cfQuery(apiToken, `
      query ($zoneTag: string!, $since: string!, $until: string!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            httpRequests1dGroups(
              filter: { date_geq: $since, date_leq: $until }
              limit: 100
            ) {
              sum {
                countryMap { clientCountryName requests threats bytes }
                browserMap { uaBrowserFamily pageViews }
                responseStatusMap { edgeResponseStatus requests }
              }
            }
          }
        }
      }
    `, { zoneTag: zoneId, since: start, until: end });

    const breakdownGroups = breakdownData.viewer.zones[0]?.httpRequests1dGroups || [];

    // Aggregate country data across days
    const countryAgg = {};
    breakdownGroups.forEach((g) => {
      (g.sum.countryMap || []).forEach((c) => {
        if (!countryAgg[c.clientCountryName]) {
          countryAgg[c.clientCountryName] = { country: c.clientCountryName, requests: 0, threats: 0, bandwidth: 0 };
        }
        countryAgg[c.clientCountryName].requests += c.requests;
        countryAgg[c.clientCountryName].threats += c.threats;
        countryAgg[c.clientCountryName].bandwidth += c.bytes;
      });
    });
    const countries = Object.values(countryAgg)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 15);

    // Aggregate browser data
    const browserAgg = {};
    breakdownGroups.forEach((g) => {
      (g.sum.browserMap || []).forEach((b) => {
        const name = b.uaBrowserFamily || "Unknown";
        browserAgg[name] = (browserAgg[name] || 0) + b.pageViews;
      });
    });
    const browsers = Object.entries(browserAgg)
      .map(([name, pageViews]) => ({ name, pageViews }))
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 10);

    // Aggregate status codes
    const statusAgg = {};
    breakdownGroups.forEach((g) => {
      (g.sum.responseStatusMap || []).forEach((s) => {
        const code = s.edgeResponseStatus;
        statusAgg[code] = (statusAgg[code] || 0) + s.requests;
      });
    });
    const statusCodes = Object.entries(statusAgg)
      .map(([code, requests]) => ({ code: Number(code), requests }))
      .sort((a, b) => b.requests - a.requests);

    // ── Top referrers (via Web Analytics if available) ────────────
    let referrers = [];
    try {
      const refData = await cfQuery(apiToken, `
        query ($zoneTag: string!, $since: string!, $until: string!) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              httpRequests1dGroups(
                filter: { date_geq: $since, date_leq: $until }
                limit: 100
              ) {
                sum {
                  clientHTTPVersionMap { clientHTTPProtocol requests }
                }
              }
            }
          }
        }
      `, { zoneTag: zoneId, since: start, until: end });

      const refGroups = refData.viewer.zones[0]?.httpRequests1dGroups || [];
      const protoAgg = {};
      refGroups.forEach((g) => {
        (g.sum.clientHTTPVersionMap || []).forEach((p) => {
          const name = p.clientHTTPProtocol || "Unknown";
          protoAgg[name] = (protoAgg[name] || 0) + p.requests;
        });
      });
      referrers = Object.entries(protoAgg)
        .map(([protocol, requests]) => ({ protocol, requests }))
        .sort((a, b) => b.requests - a.requests);
    } catch {
      // Protocol data may not be available on all plans
    }

    const result = {
      zoneName,
      dateRange: { start, end },
      totals,
      dailyTrend,
      countries,
      browsers,
      statusCodes,
      httpProtocols: referrers,
    };

    // ── Store in Supabase ────────────────────────────────────────
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("cloudflare_analytics").insert({
          user_id: user.id,
          zone_id: zoneId,
          zone_name: zoneName,
          date_range: `${start} to ${end}`,
          totals,
          daily_trend: dailyTrend,
          countries,
          browsers,
          status_codes: statusCodes,
          http_protocols: referrers,
          fetched_at: new Date().toISOString(),
        });
      }
    } catch (storeErr) {
      console.error("Failed to store Cloudflare analytics:", storeErr);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Cloudflare analytics error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

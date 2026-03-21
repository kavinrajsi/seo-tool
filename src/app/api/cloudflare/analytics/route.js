import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

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
    const { apiToken, zoneId, zoneName, dateRange = "7", teamId, projectId } = await req.json();

    if (!apiToken || !zoneId) {
      return NextResponse.json({ error: "API token and zone ID are required" }, { status: 400 });
    }

    const days = Number(dateRange);
    const useHourly = days <= 1;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // For hourly: use ISO datetimes; for daily: use date strings
    const sinceISO = startDate.toISOString();
    const untilISO = endDate.toISOString();
    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    let dailyTrend;
    let totals;

    if (useHourly) {
      // ── Hourly data for 24h (matches Cloudflare's rolling window) ──
      const overviewData = await cfQuery(apiToken, `
        query ($zoneTag: string!, $since: String!, $until: String!) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              httpRequests1hGroups(
                filter: { datetime_geq: $since, datetime_leq: $until }
                limit: 100
                orderBy: [datetime_ASC]
              ) {
                dimensions { datetime }
                sum {
                  requests
                  cachedRequests
                  pageViews
                  threats
                  bytes
                  cachedBytes
                }
                uniq { uniques }
              }
            }
          }
        }
      `, { zoneTag: zoneId, since: sinceISO, until: untilISO });

      const hourlyGroups = overviewData.viewer.zones[0]?.httpRequests1hGroups || [];

      // Aggregate hourly into daily buckets for the trend chart
      const dayMap = {};
      for (const g of hourlyGroups) {
        const date = g.dimensions.datetime.split("T")[0];
        if (!dayMap[date]) {
          dayMap[date] = { date, requests: 0, cachedRequests: 0, uncachedRequests: 0, pageViews: 0, visitors: 0, threats: 0, bandwidth: 0, cachedBytes: 0 };
        }
        const d = dayMap[date];
        d.requests += g.sum.requests;
        d.cachedRequests += g.sum.cachedRequests;
        d.uncachedRequests += g.sum.requests - g.sum.cachedRequests;
        d.pageViews += g.sum.pageViews;
        d.visitors += g.uniq.uniques;
        d.threats += g.sum.threats;
        d.bandwidth += g.sum.bytes;
        d.cachedBytes += g.sum.cachedBytes;
      }
      dailyTrend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

      totals = dailyTrend.reduce(
        (acc, d) => ({
          requests: acc.requests + d.requests,
          cachedRequests: acc.cachedRequests + d.cachedRequests,
          uncachedRequests: acc.uncachedRequests + d.uncachedRequests,
          pageViews: acc.pageViews + d.pageViews,
          visitors: acc.visitors + d.visitors,
          threats: acc.threats + d.threats,
          bandwidth: acc.bandwidth + d.bandwidth,
          cachedBytes: acc.cachedBytes + d.cachedBytes,
        }),
        { requests: 0, cachedRequests: 0, uncachedRequests: 0, pageViews: 0, visitors: 0, threats: 0, bandwidth: 0, cachedBytes: 0 }
      );
    } else {
      // ── Daily data for 7/14/30 day ranges ──────────────────────────
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
                  cachedRequests
                  pageViews
                  threats
                  bytes
                  cachedBytes
                }
                uniq { uniques }
              }
            }
          }
        }
      `, { zoneTag: zoneId, since: start, until: end });

      const dailyGroups = overviewData.viewer.zones[0]?.httpRequests1dGroups || [];

      dailyTrend = dailyGroups.map((g) => ({
        date: g.dimensions.date,
        requests: g.sum.requests,
        cachedRequests: g.sum.cachedRequests,
        uncachedRequests: g.sum.requests - g.sum.cachedRequests,
        pageViews: g.sum.pageViews,
        visitors: g.uniq.uniques,
        threats: g.sum.threats,
        bandwidth: g.sum.bytes,
        cachedBytes: g.sum.cachedBytes,
      }));

      totals = dailyTrend.reduce(
        (acc, d) => ({
          requests: acc.requests + d.requests,
          cachedRequests: acc.cachedRequests + d.cachedRequests,
          uncachedRequests: acc.uncachedRequests + d.uncachedRequests,
          pageViews: acc.pageViews + d.pageViews,
          visitors: acc.visitors + d.visitors,
          threats: acc.threats + d.threats,
          bandwidth: acc.bandwidth + d.bandwidth,
          cachedBytes: acc.cachedBytes + d.cachedBytes,
        }),
        { requests: 0, cachedRequests: 0, uncachedRequests: 0, pageViews: 0, visitors: 0, threats: 0, bandwidth: 0, cachedBytes: 0 }
      );
    }

    // ── Top content, countries, browsers, referrers, status codes ──
    const breakdownFilter = useHourly
      ? `datetime_geq: $since, datetime_leq: $until`
      : `date_geq: $since, date_leq: $until`;
    const breakdownGroup = useHourly ? "httpRequests1hGroups" : "httpRequests1dGroups";
    const breakdownData = await cfQuery(apiToken, `
      query ($zoneTag: string!, $since: String!, $until: String!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            ${breakdownGroup}(
              filter: { ${breakdownFilter} }
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
    `, { zoneTag: zoneId, since: useHourly ? sinceISO : start, until: useHourly ? untilISO : end });

    const breakdownGroups = breakdownData.viewer.zones[0]?.[breakdownGroup] || [];

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

    // ── HTTP protocol versions ────────────────────────────────────
    let referrers = [];
    try {
      const refData = await cfQuery(apiToken, `
        query ($zoneTag: string!, $since: String!, $until: String!) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              ${breakdownGroup}(
                filter: { ${breakdownFilter} }
                limit: 100
              ) {
                sum {
                  clientHTTPVersionMap { clientHTTPProtocol requests }
                }
              }
            }
          }
        }
      `, { zoneTag: zoneId, since: useHourly ? sinceISO : start, until: useHourly ? untilISO : end });

      const refGroups = refData.viewer.zones[0]?.[breakdownGroup] || [];
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
    } catch (err) {
      logError("cloudflare-analytics/fetch-protocols", err);
    }

    // ── Core Web Vitals (LCP, INP, CLS) via RUM ──────────────────
    let webVitals = null;
    try {
      const vitalsData = await cfQuery(apiToken, `
        query ($zoneTag: string!, $since: String!, $until: String!) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              rumWebVitalsEventsAdaptiveGroups(
                filter: { datetime_geq: $since, datetime_leq: $until }
                limit: 1
              ) {
                count
                quantiles {
                  largestContentfulPaintP75
                  interactionToNextPaintP75
                  cumulativeLayoutShiftP75
                  firstContentfulPaintP75
                }
                avg {
                  largestContentfulPaint
                  interactionToNextPaint
                  cumulativeLayoutShift
                  firstContentfulPaint
                }
              }
            }
          }
        }
      `, { zoneTag: zoneId, since: sinceISO, until: untilISO });

      const vitalsGroups = vitalsData.viewer.zones[0]?.rumWebVitalsEventsAdaptiveGroups || [];
      if (vitalsGroups.length > 0) {
        const g = vitalsGroups[0];
        webVitals = {
          count: g.count,
          lcp: { p75: g.quantiles.largestContentfulPaintP75, avg: g.avg.largestContentfulPaint },
          inp: { p75: g.quantiles.interactionToNextPaintP75, avg: g.avg.interactionToNextPaint },
          cls: { p75: g.quantiles.cumulativeLayoutShiftP75, avg: g.avg.cumulativeLayoutShift },
          fcp: { p75: g.quantiles.firstContentfulPaintP75, avg: g.avg.firstContentfulPaint },
        };
      }
    } catch (err) {
      logError("cloudflare-analytics/fetch-web-vitals", err);
    }

    // ── Performance: TTFB & page load times via RUM ─────────────
    let performance = null;
    try {
      const perfData = await cfQuery(apiToken, `
        query ($zoneTag: string!, $since: String!, $until: String!) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              rumPerformanceEventsAdaptiveGroups(
                filter: { datetime_geq: $since, datetime_leq: $until }
                limit: 1
              ) {
                count
                quantiles {
                  timeToFirstByteP50
                  timeToFirstByteP75
                  timeToFirstByteP99
                  loadTimeP50
                  loadTimeP75
                  loadTimeP99
                  firstPaintP50
                  firstPaintP75
                  firstContentfulPaintP50
                  firstContentfulPaintP75
                }
                avg {
                  timeToFirstByte
                  loadTime
                  firstPaint
                  firstContentfulPaint
                }
              }
            }
          }
        }
      `, { zoneTag: zoneId, since: sinceISO, until: untilISO });

      const perfGroups = perfData.viewer.zones[0]?.rumPerformanceEventsAdaptiveGroups || [];
      if (perfGroups.length > 0) {
        const g = perfGroups[0];
        performance = {
          count: g.count,
          ttfb: {
            p50: g.quantiles.timeToFirstByteP50,
            p75: g.quantiles.timeToFirstByteP75,
            p99: g.quantiles.timeToFirstByteP99,
            avg: g.avg.timeToFirstByte,
          },
          loadTime: {
            p50: g.quantiles.loadTimeP50,
            p75: g.quantiles.loadTimeP75,
            p99: g.quantiles.loadTimeP99,
            avg: g.avg.loadTime,
          },
          firstPaint: {
            p50: g.quantiles.firstPaintP50,
            p75: g.quantiles.firstPaintP75,
          },
          fcp: {
            p50: g.quantiles.firstContentfulPaintP50,
            p75: g.quantiles.firstContentfulPaintP75,
          },
        };
      }
    } catch (err) {
      logError("cloudflare-analytics/fetch-performance", err);
    }

    // Compute min/max visitors from daily trend
    const visitorValues = dailyTrend.map((d) => d.visitors).filter((v) => v > 0);
    totals.maxVisitors = visitorValues.length ? Math.max(...visitorValues) : 0;
    totals.minVisitors = visitorValues.length ? Math.min(...visitorValues) : 0;
    totals.uncachedBytes = totals.bandwidth - totals.cachedBytes;

    const result = {
      zoneName,
      dateRange: { start, end },
      totals,
      dailyTrend,
      countries,
      browsers,
      statusCodes,
      httpProtocols: referrers,
      webVitals,
      performance,
    };

    // ── Store in Supabase ────────────────────────────────────────
    try {
      const auth = await getUserFromRequest(req);
      if (auth) {
        const { user, supabase } = auth;
        await supabase.from("cloudflare_analytics").insert({
          user_id: user.id,
          team_id: teamId || null,
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

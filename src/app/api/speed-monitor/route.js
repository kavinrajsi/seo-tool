import { NextResponse } from "next/server";

export const maxDuration = 60;

const USER_AGENT =
  "Mozilla/5.0 (compatible; SEOToolBot/1.0; +https://seo-tool.dev)";

/**
 * Measure a single fetch to the target URL and return timing + metadata.
 */
async function measureFetch(targetUrl) {
  const start = Date.now();
  let ttfb = null;

  const res = await fetch(targetUrl, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  // TTFB: time until headers are available (response object created)
  ttfb = Date.now() - start;

  const body = await res.text();
  const totalTime = Date.now() - start;
  const sizeBytes = Buffer.byteLength(body, "utf8");

  return {
    status: res.status,
    statusText: res.statusText,
    ttfb,
    totalTime,
    sizeBytes,
    redirected: res.redirected,
    headers: {
      server: res.headers.get("server") || "",
      contentEncoding: res.headers.get("content-encoding") || "",
      cacheControl: res.headers.get("cache-control") || "",
      contentType: res.headers.get("content-type") || "",
    },
  };
}

/**
 * Compute a letter grade from average response time in ms.
 */
function computeGrade(avgMs) {
  if (avgMs < 500) return "A";
  if (avgMs < 1000) return "B";
  if (avgMs < 2000) return "C";
  if (avgMs < 3000) return "D";
  return "F";
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Normalize URL
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const isHttps = parsedUrl.protocol === "https:";

    // Run 3 consecutive fetches to measure variability
    const measurements = [];
    let firstResult = null;

    for (let i = 0; i < 3; i++) {
      try {
        const m = await measureFetch(targetUrl);
        measurements.push(m);
        if (i === 0) firstResult = m;
      } catch (err) {
        // If the very first fetch fails, the site is down
        if (i === 0) {
          return NextResponse.json({
            url: targetUrl,
            status: 0,
            statusText: "Connection Failed",
            timing: {
              ttfb: null,
              totalTime: null,
              avgResponseTime: null,
              minResponseTime: null,
              maxResponseTime: null,
            },
            size: { html: 0, htmlKB: 0 },
            headers: {
              server: "",
              contentEncoding: "",
              cacheControl: "",
              contentType: "",
            },
            ssl: { isHttps, redirected: false },
            uptime: { isUp: false, statusCode: 0, error: err.message },
            grade: "F",
            fetchTimes: [],
            checkedAt: new Date().toISOString(),
          });
        }
        // Skip failed subsequent fetches
      }
    }

    const responseTimes = measurements.map((m) => m.totalTime);
    const avgResponseTime = Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    );
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    const grade = computeGrade(avgResponseTime);
    const statusCode = firstResult.status;
    const isUp = statusCode >= 200 && statusCode < 500;

    const result = {
      url: targetUrl,
      status: firstResult.status,
      statusText: firstResult.statusText,
      timing: {
        ttfb: firstResult.ttfb,
        totalTime: firstResult.totalTime,
        avgResponseTime,
        minResponseTime,
        maxResponseTime,
      },
      size: {
        html: firstResult.sizeBytes,
        htmlKB: Math.round((firstResult.sizeBytes / 1024) * 100) / 100,
      },
      headers: firstResult.headers,
      ssl: {
        isHttps,
        redirected: firstResult.redirected,
      },
      uptime: {
        isUp,
        statusCode,
      },
      grade,
      fetchTimes: responseTimes,
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Speed check failed" },
      { status: 500 }
    );
  }
}

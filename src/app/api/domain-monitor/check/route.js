import { NextResponse } from "next/server";

const FETCH_TIMEOUT = 10000;

async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const start = Date.now();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FireflyBot/1.0" },
      redirect: "follow",
    });
    const responseTime = Date.now() - start;
    return { res, responseTime };
  } finally {
    clearTimeout(timer);
  }
}

function parseSslFromHeaders(headers, urlStr) {
  const result = { ssl: false, issuer: null, validFrom: null, validTo: null };
  try {
    const parsed = new URL(urlStr);
    result.ssl = parsed.protocol === "https:";
  } catch {
    // skip
  }
  return result;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    let url = domain.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    let hostname;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    // Check HTTP status + response time
    let httpStatus = 0;
    let httpStatusText = "";
    let responseTime = 0;
    let ssl = false;
    let redirectUrl = null;
    let serverHeader = null;
    let contentType = null;

    try {
      const { res, responseTime: rt } = await fetchWithTimeout(url);
      httpStatus = res.status;
      httpStatusText = res.statusText;
      responseTime = rt;
      ssl = new URL(res.url).protocol === "https:";
      redirectUrl = res.url !== url ? res.url : null;
      serverHeader = res.headers.get("server") || null;
      contentType = res.headers.get("content-type") || null;
    } catch (err) {
      if (err.name === "AbortError") {
        httpStatusText = "Timeout";
      } else {
        httpStatusText = err.message || "Connection failed";
      }
    }

    // Check DNS by trying to resolve (we already connected, so if httpStatus > 0 DNS is fine)
    const dnsOk = httpStatus > 0;

    // Determine overall status
    let status = "down";
    if (httpStatus >= 200 && httpStatus < 400) {
      status = "up";
    } else if (httpStatus >= 400 && httpStatus < 500) {
      status = "issue";
    } else if (httpStatus >= 500) {
      status = "issue";
    }

    return NextResponse.json({
      domain: hostname,
      url,
      status,
      httpStatus,
      httpStatusText,
      responseTime,
      ssl,
      dnsOk,
      redirectUrl,
      serverHeader,
      contentType,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Check failed: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}

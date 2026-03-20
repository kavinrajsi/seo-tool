import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { url, strategy = "mobile" } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http")) {
      targetUrl = "https://" + targetUrl;
    }

    // Google PageSpeed Insights API (free, no key needed for basic use)
    const fetchUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;

    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `PageSpeed API error: ${res.status} ${errBody.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Extract key metrics from Lighthouse result
    const lighthouse = data.lighthouseResult || {};
    const categories = lighthouse.categories || {};
    const audits = lighthouse.audits || {};

    // Category scores (0-100)
    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
    };

    // Core Web Vitals
    const metrics = {
      fcp: {
        label: "First Contentful Paint",
        value: audits["first-contentful-paint"]?.displayValue || "N/A",
        score: audits["first-contentful-paint"]?.score ?? null,
        numericValue: audits["first-contentful-paint"]?.numericValue || 0,
      },
      lcp: {
        label: "Largest Contentful Paint",
        value: audits["largest-contentful-paint"]?.displayValue || "N/A",
        score: audits["largest-contentful-paint"]?.score ?? null,
        numericValue: audits["largest-contentful-paint"]?.numericValue || 0,
      },
      tbt: {
        label: "Total Blocking Time",
        value: audits["total-blocking-time"]?.displayValue || "N/A",
        score: audits["total-blocking-time"]?.score ?? null,
        numericValue: audits["total-blocking-time"]?.numericValue || 0,
      },
      cls: {
        label: "Cumulative Layout Shift",
        value: audits["cumulative-layout-shift"]?.displayValue || "N/A",
        score: audits["cumulative-layout-shift"]?.score ?? null,
        numericValue: audits["cumulative-layout-shift"]?.numericValue || 0,
      },
      si: {
        label: "Speed Index",
        value: audits["speed-index"]?.displayValue || "N/A",
        score: audits["speed-index"]?.score ?? null,
        numericValue: audits["speed-index"]?.numericValue || 0,
      },
      tti: {
        label: "Time to Interactive",
        value: audits["interactive"]?.displayValue || "N/A",
        score: audits["interactive"]?.score ?? null,
        numericValue: audits["interactive"]?.numericValue || 0,
      },
    };

    // Opportunities (things to fix)
    const opportunities = [];
    for (const [key, audit] of Object.entries(audits)) {
      if (
        audit.details?.type === "opportunity" &&
        audit.score !== null &&
        audit.score < 1
      ) {
        opportunities.push({
          id: key,
          title: audit.title,
          description: audit.description,
          displayValue: audit.displayValue || "",
          score: audit.score,
          savings: audit.details?.overallSavingsMs
            ? `${Math.round(audit.details.overallSavingsMs)} ms`
            : audit.details?.overallSavingsBytes
            ? `${Math.round(audit.details.overallSavingsBytes / 1024)} KB`
            : "",
        });
      }
    }
    opportunities.sort((a, b) => a.score - b.score);

    // Diagnostics (informational audits that failed)
    const diagnostics = [];
    for (const [key, audit] of Object.entries(audits)) {
      if (
        audit.details?.type !== "opportunity" &&
        audit.score !== null &&
        audit.score < 1 &&
        audit.scoreDisplayMode !== "informative" &&
        audit.scoreDisplayMode !== "notApplicable" &&
        audit.scoreDisplayMode !== "manual"
      ) {
        diagnostics.push({
          id: key,
          title: audit.title,
          description: audit.description,
          displayValue: audit.displayValue || "",
          score: audit.score,
        });
      }
    }
    diagnostics.sort((a, b) => a.score - b.score);

    // Passed audits
    const passed = [];
    for (const [key, audit] of Object.entries(audits)) {
      if (audit.score === 1 && audit.scoreDisplayMode === "binary") {
        passed.push({
          id: key,
          title: audit.title,
        });
      }
    }

    return NextResponse.json({
      url: targetUrl,
      strategy,
      scores,
      metrics,
      opportunities: opportunities.slice(0, 15),
      diagnostics: diagnostics.slice(0, 15),
      passed,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to run PageSpeed analysis" },
      { status: 500 }
    );
  }
}

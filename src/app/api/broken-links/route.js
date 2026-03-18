import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const maxDuration = 60;

const MAX_PAGES = 50;
const MAX_EXTERNAL_CHECKS = 200;
const FETCH_TIMEOUT = 8000;
const HEAD_TIMEOUT = 5000;
const CRAWL_DELAY = 200;

const UA =
  "Mozilla/5.0 (compatible; SEOToolBot-Kavin/1.0; +https://seo-tool.dev)";

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      redirect: "follow",
    });
    const html = res.headers.get("content-type")?.includes("text/html")
      ? await res.text()
      : null;
    return { url, status: res.status, html };
  } catch {
    return { url, status: 0, html: null };
  }
}

async function headCheck(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(HEAD_TIMEOUT),
      redirect: "follow",
    });
    return { url, status: res.status };
  } catch {
    // Fallback to GET if HEAD is rejected
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(HEAD_TIMEOUT),
        redirect: "follow",
      });
      // Abort body immediately — we only need the status
      res.body?.cancel();
      return { url, status: res.status };
    } catch {
      return { url, status: 0 };
    }
  }
}

function resolveUrl(base, href) {
  try {
    const resolved = new URL(href, base);
    resolved.hash = "";
    return resolved.href;
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let startUrl = url.trim();
    if (!startUrl.startsWith("http")) startUrl = "https://" + startUrl;

    const origin = new URL(startUrl).origin;

    // Track all links found: { sourceUrl, targetUrl, linkText, type, status }
    const brokenLinks = [];
    const allLinks = []; // for summary stats
    const visited = new Set();
    const queue = [startUrl];
    const externalUrls = new Map(); // url -> { sources: [{ page, text }] }

    // BFS crawl internal pages
    let crawled = 0;
    while (queue.length > 0 && crawled < MAX_PAGES) {
      const pageUrl = queue.shift();
      if (visited.has(pageUrl)) continue;
      visited.add(pageUrl);
      crawled++;

      await delay(CRAWL_DELAY);
      const page = await fetchPage(pageUrl);

      // If internal page itself is broken
      if (page.status >= 400 || page.status === 0) {
        brokenLinks.push({
          source: "(direct crawl)",
          target: pageUrl,
          text: "",
          type: "internal",
          status: page.status,
        });
      }

      if (!page.html) continue;

      const $ = cheerio.load(page.html);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;

        const resolved = resolveUrl(pageUrl, href);
        if (!resolved) return;

        const linkText = $(el).text().trim().slice(0, 100);
        const isInternal = resolved.startsWith(origin);

        allLinks.push({ source: pageUrl, target: resolved, type: isInternal ? "internal" : "external" });

        if (isInternal) {
          if (!visited.has(resolved) && !queue.includes(resolved)) {
            queue.push(resolved);
          }
        } else {
          // Collect external links for batch checking
          if (!externalUrls.has(resolved)) {
            externalUrls.set(resolved, { sources: [] });
          }
          externalUrls.get(resolved).sources.push({ page: pageUrl, text: linkText });
        }
      });

      // Check internal links on this page that already resolved to errors
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const resolved = resolveUrl(pageUrl, href);
        if (!resolved || !resolved.startsWith(origin)) return;

        // If we've already visited this page and it was an error
        if (visited.has(resolved)) {
          const existing = brokenLinks.find(
            (b) => b.target === resolved && b.source === "(direct crawl)"
          );
          if (existing) {
            const linkText = $(el).text().trim().slice(0, 100);
            // Add the actual source reference
            if (!brokenLinks.some((b) => b.source === pageUrl && b.target === resolved)) {
              brokenLinks.push({
                source: pageUrl,
                target: resolved,
                text: linkText,
                type: "internal",
                status: existing.status,
              });
            }
          }
        }
      });
    }

    // Check external links (HEAD requests, capped)
    const externalEntries = [...externalUrls.entries()].slice(0, MAX_EXTERNAL_CHECKS);
    // Batch in groups of 10 for controlled concurrency
    for (let i = 0; i < externalEntries.length; i += 10) {
      const batch = externalEntries.slice(i, i + 10);
      const results = await Promise.all(
        batch.map(([extUrl]) => headCheck(extUrl))
      );
      for (let j = 0; j < results.length; j++) {
        const { status } = results[j];
        const [extUrl, { sources }] = batch[j];
        if (status >= 400 || status === 0) {
          for (const src of sources) {
            brokenLinks.push({
              source: src.page,
              target: extUrl,
              text: src.text,
              type: "external",
              status,
            });
          }
        }
      }
    }

    // Summary
    const internalLinkCount = allLinks.filter((l) => l.type === "internal").length;
    const externalLinkCount = allLinks.filter((l) => l.type === "external").length;
    const brokenInternalCount = brokenLinks.filter((b) => b.type === "internal").length;
    const brokenExternalCount = brokenLinks.filter((b) => b.type === "external").length;

    return NextResponse.json({
      url: startUrl,
      pages_crawled: crawled,
      total_internal_links: internalLinkCount,
      total_external_links: externalLinkCount,
      external_links_checked: externalEntries.length,
      broken_links: brokenLinks,
      summary: {
        broken_internal: brokenInternalCount,
        broken_external: brokenExternalCount,
        total_broken: brokenLinks.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Broken link check failed" },
      { status: 500 }
    );
  }
}

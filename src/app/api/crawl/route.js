import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const maxDuration = 60;

const MAX_PAGES = 50;
const FETCH_TIMEOUT = 8000;
const CRAWL_DELAY = 200; // ms between requests to be polite

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
    return { url, status: res.status, html, redirected: res.redirected };
  } catch {
    return { url, status: 0, html: null, redirected: false };
  }
}

function resolveUrl(base, href) {
  try {
    const resolved = new URL(href, base);
    resolved.hash = "";
    resolved.search = "";
    return resolved.href;
  } catch {
    return null;
  }
}

async function fetchSitemap(origin) {
  const urls = new Set();
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!res.ok) return urls;
    const xml = await res.text();
    // Extract <loc> entries
    const matches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
    for (const m of matches) {
      const loc = m[1].trim();
      // Check if this is a sitemap index entry
      if (loc.endsWith(".xml")) {
        try {
          const subRes = await fetch(loc, {
            headers: { "User-Agent": UA },
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
          });
          if (subRes.ok) {
            const subXml = await subRes.text();
            const subMatches = subXml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
            for (const sm of subMatches) {
              if (!sm[1].trim().endsWith(".xml")) {
                urls.add(sm[1].trim());
              }
            }
          }
        } catch {
          // skip sub-sitemap errors
        }
      } else {
        urls.add(loc);
      }
    }
  } catch {
    // sitemap not available
  }
  return urls;
}

function analyzePage(url, html) {
  const $ = cheerio.load(html);
  const result = {
    url,
    internalLinks: [],
    canonical: null,
    selfCanonical: false,
    canonicalToOther: false,
    noCanonical: true,
    hreflang: [],
    hasHreflangIssues: false,
    hasAmpLink: false,
    markup: {
      schemaOrg_microdata: false,
      schemaOrg_jsonld: false,
      openGraph: false,
      twitterCards: false,
      microformats: false,
    },
  };

  const origin = new URL(url).origin;

  // Internal links
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const resolved = resolveUrl(url, href);
    if (resolved && resolved.startsWith(origin)) {
      result.internalLinks.push(resolved);
    }
  });

  // Canonical
  const canonicalHref = $('link[rel="canonical"]').attr("href");
  if (canonicalHref) {
    const resolvedCanonical = resolveUrl(url, canonicalHref);
    result.canonical = resolvedCanonical;
    result.noCanonical = false;
    // Normalize for comparison (strip trailing slash)
    const norm = (u) => u?.replace(/\/+$/, "");
    result.selfCanonical = norm(resolvedCanonical) === norm(url);
    result.canonicalToOther = !result.selfCanonical;
  }

  // Hreflang
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang");
    const href = $(el).attr("href");
    result.hreflang.push({ lang, href });
  });
  if (result.hreflang.length > 0) {
    // Check for issues: missing x-default, self-referencing missing
    const langs = result.hreflang.map((h) => h.lang);
    const hasXDefault = langs.includes("x-default");
    const selfRef = result.hreflang.some((h) => {
      const norm = (u) => u?.replace(/\/+$/, "");
      return norm(resolveUrl(url, h.href)) === norm(url);
    });
    result.hasHreflangIssues = !hasXDefault || !selfRef;
  }

  // AMP
  result.hasAmpLink =
    $('link[rel="amphtml"]').length > 0;

  // Markup: Schema.org Microdata
  result.markup.schemaOrg_microdata =
    $("[itemscope][itemtype*='schema.org']").length > 0;

  // Markup: Schema.org JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).html();
    if (text && text.includes("schema.org")) {
      result.markup.schemaOrg_jsonld = true;
    }
  });

  // Markup: Open Graph
  result.markup.openGraph =
    $('meta[property^="og:"]').length > 0;

  // Markup: Twitter Cards
  result.markup.twitterCards =
    $('meta[name^="twitter:"]').length > 0;

  // Markup: Microformats (h-card, h-entry, vcard, hentry, etc.)
  result.markup.microformats =
    $("[class*='h-card'], [class*='h-entry'], [class*='h-feed'], [class*='vcard'], [class*='hentry']")
      .length > 0;

  return result;
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

    // Fetch sitemap in parallel with first page
    const [sitemapUrls, firstPage] = await Promise.all([
      fetchSitemap(origin),
      fetchPage(startUrl),
    ]);

    // BFS crawl
    const visited = new Map(); // url -> { status, depth, pageData }
    const queue = [{ url: startUrl, depth: 0 }];
    const incomingLinks = {}; // url -> count

    // Process first page
    visited.set(startUrl, {
      status: firstPage.status,
      depth: 0,
      pageData: firstPage.html ? analyzePage(startUrl, firstPage.html) : null,
    });

    if (firstPage.html) {
      const pageData = analyzePage(startUrl, firstPage.html);
      visited.get(startUrl).pageData = pageData;
      for (const link of pageData.internalLinks) {
        incomingLinks[link] = (incomingLinks[link] || 0) + 1;
        if (!visited.has(link) && !queue.some((q) => q.url === link)) {
          queue.push({ url: link, depth: 1 });
        }
      }
    }

    // Continue BFS
    let queueIndex = 1; // skip first (already processed)
    while (queueIndex < queue.length && visited.size < MAX_PAGES) {
      const { url: pageUrl, depth } = queue[queueIndex++];
      if (visited.has(pageUrl)) continue;

      await delay(CRAWL_DELAY);
      const page = await fetchPage(pageUrl);

      const pageData = page.html ? analyzePage(pageUrl, page.html) : null;
      visited.set(pageUrl, { status: page.status, depth, pageData });

      if (pageData) {
        for (const link of pageData.internalLinks) {
          incomingLinks[link] = (incomingLinks[link] || 0) + 1;
          if (!visited.has(link) && !queue.some((q) => q.url === link)) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }
    }

    // Aggregate statistics
    const pages = Array.from(visited.entries()).map(([pageUrl, data]) => ({
      url: pageUrl,
      ...data,
    }));

    // 1. HTTP Status Codes
    const statusCodes = { ok: 0, redirect: 0, client_error: 0, server_error: 0, timeout: 0 };
    const errorPages = [];
    for (const p of pages) {
      if (p.status === 0) statusCodes.timeout++;
      else if (p.status >= 500) {
        statusCodes.server_error++;
        errorPages.push({ url: p.url, status: p.status });
      } else if (p.status >= 400) {
        statusCodes.client_error++;
        errorPages.push({ url: p.url, status: p.status });
      } else if (p.status >= 300) statusCodes.redirect++;
      else statusCodes.ok++;
    }

    // 2. Sitemap vs Crawled
    const crawledUrls = new Set(pages.map((p) => p.url));
    const inSitemap = new Set();
    const notInSitemap = new Set();
    for (const pageUrl of crawledUrls) {
      // Normalize for comparison
      const normalized = pageUrl.replace(/\/+$/, "");
      const inSm =
        sitemapUrls.has(pageUrl) ||
        sitemapUrls.has(pageUrl + "/") ||
        sitemapUrls.has(normalized);
      if (inSm) inSitemap.add(pageUrl);
      else notInSitemap.add(pageUrl);
    }
    const sitemapNotCrawled = [...sitemapUrls].filter(
      (u) => !crawledUrls.has(u) && !crawledUrls.has(u.replace(/\/+$/, ""))
    );

    // 3. Crawl Depth
    const depthBuckets = {};
    for (const p of pages) {
      const d = p.depth;
      depthBuckets[d] = (depthBuckets[d] || 0) + 1;
    }

    // 4. Incoming Internal Links
    const incomingBuckets = { zero: 0, one_to_three: 0, four_to_ten: 0, over_ten: 0 };
    const pagesWithLinkCounts = [];
    for (const p of pages) {
      const count = incomingLinks[p.url] || 0;
      pagesWithLinkCounts.push({ url: p.url, count });
      if (count === 0) incomingBuckets.zero++;
      else if (count <= 3) incomingBuckets.one_to_three++;
      else if (count <= 10) incomingBuckets.four_to_ten++;
      else incomingBuckets.over_ten++;
    }
    pagesWithLinkCounts.sort((a, b) => a.count - b.count);

    // 5. Markup Types
    const markup = {
      schemaOrg_microdata: 0,
      schemaOrg_jsonld: 0,
      openGraph: 0,
      twitterCards: 0,
      microformats: 0,
    };
    for (const p of pages) {
      if (!p.pageData) continue;
      if (p.pageData.markup.schemaOrg_microdata) markup.schemaOrg_microdata++;
      if (p.pageData.markup.schemaOrg_jsonld) markup.schemaOrg_jsonld++;
      if (p.pageData.markup.openGraph) markup.openGraph++;
      if (p.pageData.markup.twitterCards) markup.twitterCards++;
      if (p.pageData.markup.microformats) markup.microformats++;
    }

    // 6. Canonicalization
    const canonical = { noCanonical: 0, selfCanonical: 0, canonicalToOther: 0 };
    const noCanonicalpages = [];
    for (const p of pages) {
      if (!p.pageData) continue;
      if (p.pageData.noCanonical) {
        canonical.noCanonical++;
        noCanonicalpages.push(p.url);
      } else if (p.pageData.selfCanonical) canonical.selfCanonical++;
      else if (p.pageData.canonicalToOther) canonical.canonicalToOther++;
    }

    // 7. Hreflang
    const hreflang = { withIssues: 0, withoutHreflang: 0, valid: 0 };
    for (const p of pages) {
      if (!p.pageData) continue;
      if (p.pageData.hreflang.length === 0) hreflang.withoutHreflang++;
      else if (p.pageData.hasHreflangIssues) hreflang.withIssues++;
      else hreflang.valid++;
    }

    // 8. AMP
    const amp = { withAmp: 0, withoutAmp: 0 };
    for (const p of pages) {
      if (!p.pageData) continue;
      if (p.pageData.hasAmpLink) amp.withAmp++;
      else amp.withoutAmp++;
    }

    return NextResponse.json({
      total_pages: pages.length,
      max_pages: MAX_PAGES,
      sitemap_total: sitemapUrls.size,
      status_codes: statusCodes,
      error_pages: errorPages,
      sitemap: {
        in_sitemap: inSitemap.size,
        not_in_sitemap: notInSitemap.size,
        sitemap_not_crawled: sitemapNotCrawled.length,
      },
      crawl_depth: depthBuckets,
      incoming_links: incomingBuckets,
      low_link_pages: pagesWithLinkCounts.slice(0, 10),
      markup,
      canonical,
      no_canonical_pages: noCanonicalpages.slice(0, 10),
      hreflang,
      amp,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Crawl failed" },
      { status: 500 }
    );
  }
}

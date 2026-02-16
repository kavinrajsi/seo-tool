import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const FETCH_TIMEOUT = 5000;
const MAX_DEPTH = 3;

async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SEOAnalyzerBot/1.0",
        Accept: "text/xml, application/xml, text/plain, */*",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function parseSitemapXml(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls = [];
  const childSitemaps = [];

  // Check if this is a sitemap index
  const sitemapLocs = $("sitemapindex sitemap loc");
  if (sitemapLocs.length > 0) {
    sitemapLocs.each((_, el) => {
      childSitemaps.push($(el).text().trim());
    });
  } else {
    // Regular sitemap - extract full metadata
    $("urlset url").each((_, el) => {
      const loc = $(el).find("loc").text().trim();
      if (!loc) return;
      const lastmod = $(el).find("lastmod").text().trim() || null;
      const changefreq = $(el).find("changefreq").text().trim() || null;
      const priority = $(el).find("priority").text().trim() || null;
      urls.push({ loc, lastmod, changefreq, priority });
    });
  }

  return { urls, childSitemaps };
}

async function parseSitemapFromUrl(sitemapUrl, depth = 0) {
  if (depth > MAX_DEPTH) return { urls: [], sitemapCount: 0 };

  try {
    const res = await fetchWithTimeout(sitemapUrl);
    if (!res.ok) return { urls: [], sitemapCount: 0 };

    const xml = await res.text();
    const { urls, childSitemaps } = parseSitemapXml(xml);

    if (childSitemaps.length > 0) {
      let allUrls = [];
      let sitemapCount = childSitemaps.length;
      for (const childUrl of childSitemaps) {
        const child = await parseSitemapFromUrl(childUrl, depth + 1);
        allUrls.push(...child.urls);
        sitemapCount += child.sitemapCount;
      }
      return { urls: allUrls, sitemapCount };
    }

    return { urls, sitemapCount: urls.length > 0 ? 1 : 0 };
  } catch {
    return { urls: [], sitemapCount: 0 };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, xml } = body;

    if (!url && !xml) {
      return NextResponse.json(
        { error: "Either url or xml is required" },
        { status: 400 }
      );
    }

    let result;

    if (xml) {
      // Parse raw XML from file upload
      const { urls, childSitemaps } = parseSitemapXml(xml);

      if (childSitemaps.length > 0) {
        // Sitemap index from uploaded XML - fetch child sitemaps
        let allUrls = [];
        let sitemapCount = childSitemaps.length;
        for (const childUrl of childSitemaps) {
          const child = await parseSitemapFromUrl(childUrl, 0);
          allUrls.push(...child.urls);
          sitemapCount += child.sitemapCount;
        }
        result = { urls: allUrls, sitemapCount };
      } else {
        result = { urls, sitemapCount: urls.length > 0 ? 1 : 0 };
      }
    } else {
      // Parse from URL
      let sitemapUrl = url.trim();
      if (!sitemapUrl.startsWith("http://") && !sitemapUrl.startsWith("https://")) {
        sitemapUrl = `https://${sitemapUrl}`;
      }

      // If not ending with .xml, try /sitemap.xml
      if (!sitemapUrl.endsWith(".xml")) {
        try {
          const parsed = new URL(sitemapUrl);
          sitemapUrl = `${parsed.origin}/sitemap.xml`;
        } catch {
          return NextResponse.json(
            { error: "Invalid URL" },
            { status: 400 }
          );
        }
      }

      result = await parseSitemapFromUrl(sitemapUrl);
    }

    // Deduplicate by loc
    const seen = new Set();
    const unique = [];
    for (const entry of result.urls) {
      if (!seen.has(entry.loc)) {
        seen.add(entry.loc);
        unique.push(entry);
      }
    }

    if (unique.length === 0) {
      return NextResponse.json(
        { error: "No URLs found in sitemap. Make sure the sitemap is valid XML." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      urls: unique,
      sitemapCount: result.sitemapCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse sitemap: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}

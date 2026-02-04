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

function extractOrigin(input) {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return null;
  }
}

async function parseSitemap(sitemapUrl, depth = 0) {
  if (depth > MAX_DEPTH) return [];

  const urls = [];

  try {
    const res = await fetchWithTimeout(sitemapUrl);
    if (!res.ok) return [];

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    // Check if this is a sitemap index
    const sitemapLocs = $("sitemapindex sitemap loc");
    if (sitemapLocs.length > 0) {
      const childUrls = [];
      sitemapLocs.each((_, el) => {
        childUrls.push($(el).text().trim());
      });

      // Recursively fetch child sitemaps
      for (const childUrl of childUrls) {
        const childPageUrls = await parseSitemap(childUrl, depth + 1);
        urls.push(...childPageUrls);
      }
    } else {
      // Regular sitemap — extract page URLs
      $("urlset url loc").each((_, el) => {
        const loc = $(el).text().trim();
        if (loc) urls.push(loc);
      });
    }
  } catch {
    // Individual sitemap fetch failed
  }

  return urls;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const origin = extractOrigin(url);
    if (!origin) {
      return NextResponse.json(
        { error: "Invalid URL or domain" },
        { status: 400 }
      );
    }

    // Check default sitemap location
    const sitemapEntryUrls = [`${origin}/sitemap.xml`];

    // Parse all sitemaps (handles sitemap index files recursively)
    const allUrls = [];
    let sitemapCount = 0;

    for (const sitemapUrl of sitemapEntryUrls) {
      const urls = await parseSitemap(sitemapUrl);
      if (urls.length > 0) {
        sitemapCount++;
        allUrls.push(...urls);
      }
    }

    // Deduplicate
    const uniqueUrls = [...new Set(allUrls)];

    if (uniqueUrls.length === 0) {
      return NextResponse.json(
        { error: "No URLs found in sitemap. Make sure the site has a valid sitemap.xml." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      urls: uniqueUrls,
      sitemapCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch sitemap: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}

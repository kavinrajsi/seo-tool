import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const FETCH_TIMEOUT = 5000;
const USER_AGENT = "FireflyBot/1.0";

async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(url, baseUrl) {
  try {
    const normalized = new URL(url, baseUrl);
    // Remove fragment
    normalized.hash = "";
    return normalized.href;
  } catch {
    return null;
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

async function crawlPage(url, origin, visited, maxPages) {
  if (visited.size >= maxPages) return [];
  if (visited.has(url)) return [];

  visited.add(url);
  const foundUrls = [url];

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) {
      return foundUrls;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract all links
    const links = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const normalized = normalizeUrl(href, url);
        if (
          normalized &&
          normalized.startsWith(origin) &&
          !visited.has(normalized) &&
          visited.size < maxPages
        ) {
          links.push(normalized);
        }
      }
    });

    // Crawl found links recursively (breadth-first)
    for (const link of links) {
      if (visited.size >= maxPages) break;
      const childUrls = await crawlPage(link, origin, visited, maxPages);
      foundUrls.push(...childUrls);
    }

    return foundUrls;
  } catch (err) {
    // Failed to crawl this page, but return what we found so far
    return foundUrls;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, maxPages = 100 } = body;

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

    const visited = new Set();
    const startUrl = origin + "/";

    const urls = await crawlPage(startUrl, origin, visited, maxPages);

    // Deduplicate and sort
    const uniqueUrls = [...new Set(urls)].sort();

    if (uniqueUrls.length === 0) {
      return NextResponse.json(
        { error: "No URLs found. The site may be blocking crawlers or may not exist." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      urls: uniqueUrls,
      crawledCount: uniqueUrls.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to crawl site: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}

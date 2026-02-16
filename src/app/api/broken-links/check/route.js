import * as cheerio from "cheerio";

const CONCURRENT_LIMIT = 5;
const LINK_TIMEOUT = 8000;
const PAGE_TIMEOUT = 15000;

const SKIP_PROTOCOLS = ["mailto:", "tel:", "javascript:", "data:", "blob:"];

function normalizeHref(href, baseUrl) {
  if (!href || href.startsWith("#")) return null;
  const trimmed = href.trim();
  if (SKIP_PROTOCOLS.some((p) => trimmed.toLowerCase().startsWith(p))) return null;

  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return null;
  }
}

async function checkLink(href) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LINK_TIMEOUT);

  try {
    let res = await fetch(href, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FireflyBot/1.0; +https://firefly.dev)",
      },
      redirect: "follow",
    });

    // Some servers don't support HEAD — retry with GET
    if (res.status === 405) {
      clearTimeout(timeout);
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), LINK_TIMEOUT);
      try {
        res = await fetch(href, {
          method: "GET",
          signal: controller2.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; FireflyBot/1.0; +https://firefly.dev)",
          },
          redirect: "follow",
        });
        clearTimeout(timeout2);
      } catch {
        clearTimeout(timeout2);
        return { status: 0, statusText: "Timeout" };
      }
    } else {
      clearTimeout(timeout);
    }

    return { status: res.status, statusText: res.statusText };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return { status: 0, statusText: "Timeout" };
    }
    return { status: 0, statusText: "Connection failed" };
  }
}

async function runPool(tasks, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return Response.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Fetch the page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PAGE_TIMEOUT);

    let html;
    try {
      const res = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; FireflyBot/1.0; +https://firefly.dev)",
          Accept: "text/html",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return Response.json(
          { error: `Failed to fetch URL: HTTP ${res.status}` },
          { status: 422 }
        );
      }

      html = await res.text();
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        return Response.json(
          { error: "Request timed out after 15 seconds" },
          { status: 422 }
        );
      }
      return Response.json(
        { error: "Failed to connect to URL" },
        { status: 422 }
      );
    }

    // Extract links
    const $ = cheerio.load(html);
    const seenHrefs = new Set();
    const links = [];

    $("a[href]").each((_, el) => {
      const raw = $(el).attr("href");
      const resolved = normalizeHref(raw, normalizedUrl);
      if (!resolved) return;
      if (seenHrefs.has(resolved)) return;
      seenHrefs.add(resolved);

      const anchor = $(el).text().trim().slice(0, 200);
      let type = "external";
      try {
        const linkOrigin = new URL(resolved).origin;
        if (linkOrigin === parsedUrl.origin) type = "internal";
      } catch {
        // leave as external
      }

      links.push({ href: resolved, anchor, type });
    });

    // Check all links concurrently with pool
    const tasks = links.map((link) => async () => {
      const result = await checkLink(link.href);
      return { ...link, ...result };
    });

    const checked = await runPool(tasks, CONCURRENT_LIMIT);

    // Filter broken links (4xx, 5xx, or timeout/connection failed)
    const brokenLinks = checked.filter(
      (l) => l.status === 0 || l.status >= 400
    );

    return Response.json({
      url: normalizedUrl,
      totalLinks: links.length,
      checkedCount: checked.length,
      brokenLinks,
    });
  } catch (err) {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

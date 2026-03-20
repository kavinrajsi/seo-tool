import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";

export const maxDuration = 30;

const UA =
  "Mozilla/5.0 (compatible; SEOToolBot-Kavin/1.0; +https://seo-tool.dev)";
const FETCH_TIMEOUT = 10000;

// ── Robots.txt parser ───────────────────────────────────────────────────
function parseRobotsTxt(text) {
  const lines = text.split("\n").map((l) => l.trim());
  const groups = []; // { userAgent, rules: [{ type, path }] }
  const sitemaps = [];
  const issues = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith("#")) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      issues.push({ line: i + 1, text: line, issue: "Invalid directive (no colon)" });
      continue;
    }

    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === "user-agent") {
      current = { userAgent: value, rules: [] };
      groups.push(current);
    } else if (directive === "disallow") {
      if (!current) {
        issues.push({ line: i + 1, text: line, issue: "Disallow without User-agent" });
      } else {
        current.rules.push({ type: "disallow", path: value });
      }
    } else if (directive === "allow") {
      if (!current) {
        issues.push({ line: i + 1, text: line, issue: "Allow without User-agent" });
      } else {
        current.rules.push({ type: "allow", path: value });
      }
    } else if (directive === "sitemap") {
      sitemaps.push(value);
    } else if (directive === "crawl-delay") {
      if (current) {
        const delay = Number(value);
        if (isNaN(delay)) {
          issues.push({ line: i + 1, text: line, issue: "Invalid crawl-delay value" });
        } else {
          current.rules.push({ type: "crawl-delay", path: value });
        }
      }
    } else {
      issues.push({ line: i + 1, text: line, issue: `Unknown directive: ${directive}` });
    }
  }

  if (groups.length === 0) {
    issues.push({ line: 0, text: "", issue: "No User-agent groups defined" });
  }

  // Check for common issues
  const hasWildcard = groups.some((g) => g.userAgent === "*");
  if (!hasWildcard && groups.length > 0) {
    issues.push({ line: 0, text: "", issue: "No wildcard User-agent (*) group — most crawlers won't match any rules" });
  }

  return { groups, sitemaps, issues };
}

// ── Test a URL against robots.txt rules ─────────────────────────────────
function testUrlAgainstRobots(urlPath, groups, userAgent = "*") {
  // Find matching group
  const group = groups.find((g) => g.userAgent === userAgent) ||
    groups.find((g) => g.userAgent === "*");

  if (!group) return { allowed: true, matchedRule: null };

  // Check rules in order — most specific match wins
  let bestMatch = null;
  let bestLen = -1;

  for (const rule of group.rules) {
    if (rule.type !== "allow" && rule.type !== "disallow") continue;
    if (!rule.path) {
      // Empty disallow = allow all
      if (rule.type === "disallow") continue;
    }

    // Simple prefix matching (handles * wildcards at end)
    const pattern = rule.path.replace(/\*$/, "");
    if (urlPath.startsWith(pattern) && pattern.length > bestLen) {
      bestLen = pattern.length;
      bestMatch = rule;
    }
  }

  if (!bestMatch) return { allowed: true, matchedRule: null };
  return {
    allowed: bestMatch.type === "allow",
    matchedRule: `${bestMatch.type}: ${bestMatch.path}`,
  };
}

// ── Sitemap XML validator ───────────────────────────────────────────────
function validateSitemapXml(xml, url) {
  const issues = [];
  const urls = [];

  // Check XML declaration
  if (!xml.trim().startsWith("<?xml")) {
    issues.push("Missing XML declaration (<?xml version=\"1.0\" encoding=\"UTF-8\"?>)");
  }

  // Check for urlset or sitemapindex
  const isIndex = xml.includes("<sitemapindex");
  const isUrlset = xml.includes("<urlset");

  if (!isIndex && !isUrlset) {
    issues.push("Missing <urlset> or <sitemapindex> root element");
    return { urls, issues, isIndex, urlCount: 0 };
  }

  // Check namespace
  if (!xml.includes("sitemaps.org")) {
    issues.push("Missing sitemaps.org namespace declaration");
  }

  // Extract URLs
  const locMatches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
  for (const m of locMatches) {
    const loc = m[1].trim();
    const entry = { url: loc };

    // Extract optional fields
    const lastmodMatch = xml.slice(m.index - 200, m.index + m[0].length + 200)
      .match(/<lastmod>\s*(.*?)\s*<\/lastmod>/i);
    if (lastmodMatch) entry.lastmod = lastmodMatch[1].trim();

    const priorityMatch = xml.slice(m.index - 200, m.index + m[0].length + 200)
      .match(/<priority>\s*(.*?)\s*<\/priority>/i);
    if (priorityMatch) entry.priority = priorityMatch[1].trim();

    const changefreqMatch = xml.slice(m.index - 200, m.index + m[0].length + 200)
      .match(/<changefreq>\s*(.*?)\s*<\/changefreq>/i);
    if (changefreqMatch) entry.changefreq = changefreqMatch[1].trim();

    urls.push(entry);

    // Validate URL format
    try {
      new URL(loc);
    } catch (err) {
      logError("validators/parse-sitemap-url", err);
      issues.push(`Invalid URL: ${loc}`);
    }

    // Validate priority range
    if (entry.priority) {
      const p = Number(entry.priority);
      if (isNaN(p) || p < 0 || p > 1) {
        issues.push(`Invalid priority value "${entry.priority}" for ${loc} (must be 0.0-1.0)`);
      }
    }

    // Validate changefreq
    if (entry.changefreq) {
      const valid = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
      if (!valid.includes(entry.changefreq.toLowerCase())) {
        issues.push(`Invalid changefreq "${entry.changefreq}" for ${loc}`);
      }
    }
  }

  if (urls.length === 0) {
    issues.push("No <loc> entries found in sitemap");
  }

  if (urls.length > 50000) {
    issues.push(`Sitemap contains ${urls.length} URLs — exceeds 50,000 URL limit per sitemap`);
  }

  // Check file size (rough estimate)
  if (xml.length > 50 * 1024 * 1024) {
    issues.push("Sitemap exceeds 50MB uncompressed limit");
  }

  return { urls, issues, isIndex, urlCount: urls.length };
}

export async function POST(request) {
  try {
    const { url, type, testPath } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let baseUrl = url.trim();
    if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
    const origin = new URL(baseUrl).origin;

    if (type === "robots") {
      // Fetch robots.txt
      const robotsUrl = `${origin}/robots.txt`;
      let robotsText = "";
      let robotsStatus = 0;

      try {
        const res = await fetch(robotsUrl, {
          headers: { "User-Agent": UA },
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        robotsStatus = res.status;
        if (res.ok) {
          robotsText = await res.text();
        }
      } catch (err) {
        logError("validators/fetch-robots", err);
        return NextResponse.json({
          found: false,
          url: robotsUrl,
          status: 0,
          error: "Failed to fetch robots.txt (timeout or network error)",
        });
      }

      if (robotsStatus !== 200) {
        return NextResponse.json({
          found: false,
          url: robotsUrl,
          status: robotsStatus,
          raw: "",
          groups: [],
          sitemaps: [],
          issues: [{ line: 0, text: "", issue: `robots.txt returned HTTP ${robotsStatus}` }],
        });
      }

      const parsed = parseRobotsTxt(robotsText);

      // Test a URL if provided
      let testResult = null;
      if (testPath) {
        testResult = testUrlAgainstRobots(testPath, parsed.groups);
      }

      return NextResponse.json({
        found: true,
        url: robotsUrl,
        status: robotsStatus,
        raw: robotsText.slice(0, 10000), // cap raw text
        ...parsed,
        testResult,
      });
    }

    if (type === "sitemap") {
      // Fetch sitemap
      let sitemapUrl = `${origin}/sitemap.xml`;
      // If the user provided a specific sitemap URL, use that
      if (baseUrl.includes("sitemap") && baseUrl.endsWith(".xml")) {
        sitemapUrl = baseUrl;
      }

      let sitemapXml = "";
      let sitemapStatus = 0;

      try {
        const res = await fetch(sitemapUrl, {
          headers: { "User-Agent": UA },
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        sitemapStatus = res.status;
        if (res.ok) {
          sitemapXml = await res.text();
        }
      } catch (err) {
        logError("validators/fetch-sitemap", err);
        return NextResponse.json({
          found: false,
          url: sitemapUrl,
          status: 0,
          error: "Failed to fetch sitemap (timeout or network error)",
        });
      }

      if (sitemapStatus !== 200) {
        return NextResponse.json({
          found: false,
          url: sitemapUrl,
          status: sitemapStatus,
          urls: [],
          issues: [`Sitemap returned HTTP ${sitemapStatus}`],
        });
      }

      const validated = validateSitemapXml(sitemapXml, sitemapUrl);

      // Spot-check a few URLs (up to 5) for reachability
      const spotChecks = [];
      const toCheck = validated.urls.slice(0, 5);
      for (const entry of toCheck) {
        try {
          const res = await fetch(entry.url, {
            method: "HEAD",
            headers: { "User-Agent": UA },
            signal: AbortSignal.timeout(5000),
            redirect: "follow",
          });
          spotChecks.push({ url: entry.url, status: res.status });
        } catch (err) {
          logError("validators/spot-check-url", err);
          spotChecks.push({ url: entry.url, status: 0 });
        }
      }

      return NextResponse.json({
        found: true,
        url: sitemapUrl,
        status: sitemapStatus,
        ...validated,
        spotChecks,
      });
    }

    return NextResponse.json({ error: "type must be 'robots' or 'sitemap'" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Validation failed" },
      { status: 500 }
    );
  }
}

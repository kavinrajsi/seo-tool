import * as cheerio from "cheerio";

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let html;
    let responseHeaders = {};
    let fetchStartTime = Date.now();
    let loadTimeMs = 0;
    let contentLength = 0;
    let statusCode = 0;

    try {
      const res = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SEOAnalyzer/1.0; +https://seo-tool.dev)",
          Accept: "text/html",
        },
      });
      loadTimeMs = Date.now() - fetchStartTime;
      clearTimeout(timeout);
      statusCode = res.status;

      if (!res.ok) {
        return Response.json(
          { error: `Failed to fetch URL: HTTP ${res.status}` },
          { status: 422 }
        );
      }

      res.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      html = await res.text();
      contentLength = new TextEncoder().encode(html).length;
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        return Response.json(
          { error: "Request timed out. The website took too long to respond." },
          { status: 422 }
        );
      }
      return Response.json(
        { error: `Could not reach the website: ${fetchErr.message}` },
        { status: 422 }
      );
    }

    // Fetch robots.txt, sitemap, and PageSpeed data in parallel
    const origin = parsedUrl.origin;
    const [robotsTxt, sitemapExists, pageSpeedData] = await Promise.all([
      fetchRobotsTxt(origin),
      checkSitemap(origin),
      fetchPageSpeedInsights(normalizedUrl),
    ]);

    const $ = cheerio.load(html);

    const results = {
      title: analyzeTitle($),
      metaDescription: analyzeMetaDescription($),
      h1: analyzeH1($),
      headingHierarchy: analyzeHeadingHierarchy($),
      internalLinks: analyzeInternalLinks($, parsedUrl),
      externalLinks: analyzeExternalLinks($, parsedUrl),
      imageOptimization: analyzeImages($),
      schemaMarkup: analyzeSchema($),
      pageSpeed: analyzePageSpeed(contentLength, loadTimeMs, $),
      mobileResponsiveness: analyzeMobile($),
      sslHttps: analyzeSsl(parsedUrl),
      openGraph: analyzeOpenGraph($),
      twitterCards: analyzeTwitterCards($),
      canonicalUrl: analyzeCanonical($, normalizedUrl),
      robotsTxt: analyzeRobotsTxt(robotsTxt, origin),
      sitemapDetection: analyzeSitemap(robotsTxt, sitemapExists, origin),
      urlStructure: analyzeUrlStructure(parsedUrl),
      contentAnalysis: analyzeContent($),
      accessibility: analyzeAccessibility($),
      metaRobots: analyzeMetaRobots($),
      hreflang: analyzeHreflang($),
      favicon: analyzeFavicon($),
      lazyLoading: analyzeLazyLoading($),
      doctype: analyzeDoctype(html),
      characterEncoding: analyzeCharEncoding($, html),
      keywordsInUrl: analyzeKeywordsInUrl($, parsedUrl),
      socialImageSize: analyzeSocialImageSize($),
      googlePageSpeed: analyzeGooglePageSpeed(pageSpeedData),
      aeo: analyzeAEO($),
      geo: analyzeGEO($),
      programmaticSeo: analyzeProgrammaticSeo($, parsedUrl),
      aiSearchVisibility: analyzeAISearchVisibility($, robotsTxt),
      localSeo: analyzeLocalSeo($),
    };

    return Response.json({
      url: normalizedUrl,
      analyzedAt: new Date().toISOString(),
      loadTimeMs,
      contentLength,
      results,
    });
  } catch (err) {
    return Response.json(
      { error: "An unexpected error occurred: " + err.message },
      { status: 500 }
    );
  }
}

// --- Helper fetchers ---

async function fetchRobotsTxt(origin) {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": "SEOAnalyzer/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text.includes("User-agent") || text.includes("user-agent")) {
        return text;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function checkSitemap(origin) {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      method: "HEAD",
      headers: { "User-Agent": "SEOAnalyzer/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchPageSpeedInsights(url) {
  const apiKey = process.env.PAGESPEED_API_KEY || "";
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const categoryParams = "&category=performance&category=accessibility&category=best-practices&category=seo";
  const keyParam = apiKey ? `&key=${apiKey}` : "";
  const apiUrl = `${base}?url=${encodeURIComponent(url)}${categoryParams}${keyParam}&strategy=mobile`;

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(90000),
      });
      if (res.status === 429) {
        // Rate limited — wait and retry once
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        return { error: "rate_limited" };
      }
      if (res.status === 403) {
        return { error: "api_not_enabled" };
      }
      if (!res.ok) {
        return { error: `http_${res.status}` };
      }
      return await res.json();
    } catch (err) {
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        return { error: "timeout" };
      }
      return null;
    }
  }
  return null;
}

// --- Existing analyzers ---

function analyzeTitle($) {
  const titleEl = $("title");
  const title = titleEl.text().trim();

  if (!title) {
    return {
      score: "fail",
      title: "",
      length: 0,
      issues: ["No title tag found. Every page must have a title tag."],
      recommendations: ["Add a unique, descriptive title tag to the page."],
    };
  }

  const length = title.length;
  const issues = [];
  const recommendations = [];
  let score = "pass";

  if (length < 30) {
    issues.push(`Title is too short (${length} characters). Aim for 50-60 characters.`);
    recommendations.push("Expand your title to include more descriptive keywords.");
    score = "warning";
  } else if (length > 60) {
    issues.push(
      `Title is too long (${length} characters). Search engines typically truncate after 60 characters.`
    );
    recommendations.push(
      "Shorten your title to 60 characters or fewer to prevent truncation in search results."
    );
    score = "warning";
  }

  const words = title.split(/\s+/);
  if (words.length > 0) {
    const firstThreeWords = words.slice(0, 3).join(" ").toLowerCase();
    const hasKeywordUpfront = firstThreeWords.length > 5;
    if (!hasKeywordUpfront) {
      recommendations.push(
        "Place your primary keyword near the beginning of the title for better SEO."
      );
    }
  }

  if (title.includes("|") || title.includes("-") || title.includes(":")) {
    const separatorIndex = Math.max(
      title.indexOf("|"),
      title.indexOf("-"),
      title.indexOf(":")
    );
    const beforeSep = title.substring(0, separatorIndex).trim();
    if (beforeSep.length > 50) {
      issues.push(
        "The main keyword phrase before the separator is very long and may be truncated."
      );
      score = "warning";
    }
  }

  if (title === title.toUpperCase() && title.length > 10) {
    issues.push("Title is in ALL CAPS. This can appear aggressive in search results.");
    recommendations.push("Use title case or sentence case for a professional appearance.");
    score = "warning";
  }

  if (issues.length === 0) {
    issues.push(`Title length is good (${length} characters).`);
  }

  return { score, title, length, issues, recommendations };
}

function analyzeMetaDescription($) {
  const metaEl = $('meta[name="description"]');
  const description = metaEl.attr("content")?.trim() || "";

  if (!description) {
    return {
      score: "fail",
      description: "",
      length: 0,
      issues: ["No meta description found."],
      recommendations: [
        "Add a compelling meta description between 120-160 characters to improve click-through rates.",
      ],
    };
  }

  const length = description.length;
  const issues = [];
  const recommendations = [];
  let score = "pass";

  if (length < 70) {
    issues.push(
      `Meta description is too short (${length} characters). Aim for 120-160 characters.`
    );
    recommendations.push(
      "Expand your description to provide more context about the page content."
    );
    score = "warning";
  } else if (length > 160) {
    issues.push(
      `Meta description is too long (${length} characters). It may be truncated after 160 characters.`
    );
    recommendations.push("Shorten to 160 characters to avoid truncation in search results.");
    score = "warning";
  } else if (length >= 120 && length <= 160) {
    issues.push(`Meta description length is optimal (${length} characters).`);
  } else {
    issues.push(
      `Meta description is acceptable (${length} characters) but could be longer (120-160 ideal).`
    );
    score = "warning";
  }

  const actionWords = [
    "discover", "learn", "find", "get", "try", "explore",
    "start", "buy", "shop", "read", "see", "check",
  ];
  const descLower = description.toLowerCase();
  const hasCallToAction = actionWords.some((w) => descLower.includes(w));
  if (!hasCallToAction) {
    recommendations.push(
      "Consider adding a call-to-action word (e.g., discover, learn, explore) to boost click-through rates."
    );
  }

  return { score, description, length, issues, recommendations };
}

function analyzeH1($) {
  const h1Tags = $("h1");
  const count = h1Tags.length;
  const h1Texts = [];
  h1Tags.each((_, el) => {
    h1Texts.push($(el).text().trim());
  });

  const issues = [];
  const recommendations = [];
  let score = "pass";

  if (count === 0) {
    score = "fail";
    issues.push("No H1 tag found on the page.");
    recommendations.push(
      "Add exactly one H1 tag containing your primary keyword. The H1 is essential for content hierarchy."
    );
  } else if (count === 1) {
    issues.push("Page has exactly one H1 tag. This is correct.");
    const h1 = h1Texts[0];
    if (h1.length < 10) {
      recommendations.push(
        "Your H1 is quite short. Consider making it more descriptive with your target keyword."
      );
      score = "warning";
    }
    if (h1.length > 70) {
      recommendations.push(
        "Your H1 is quite long. Keep it concise and focused on your primary keyword."
      );
      score = "warning";
    }
  } else {
    score = "warning";
    issues.push(
      `Found ${count} H1 tags. Best practice is to have exactly one H1 per page.`
    );
    recommendations.push(
      "Consolidate to a single H1 tag. Use H2-H6 for subheadings instead."
    );
  }

  return { score, count, h1Texts, issues, recommendations };
}

function analyzeHeadingHierarchy($) {
  const headings = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const level = parseInt(tag.charAt(1), 10);
    const text = $(el).text().trim();
    headings.push({ tag, level, text: text.substring(0, 100) });
  });

  const issues = [];
  const recommendations = [];
  let score = "pass";

  if (headings.length === 0) {
    return {
      score: "fail",
      headings: [],
      issues: ["No heading tags found on the page."],
      recommendations: [
        "Add a proper heading structure starting with an H1, followed by H2s for sections, and H3s for subsections.",
      ],
    };
  }

  if (headings[0].level !== 1) {
    issues.push(
      `First heading is an <${headings[0].tag}> instead of <h1>. The page should start with an H1.`
    );
    score = "warning";
  }

  let skippedLevels = false;
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const curr = headings[i].level;
    if (curr > prev + 1) {
      skippedLevels = true;
      issues.push(
        `Heading level skipped: <${headings[i - 1].tag}> followed by <${headings[i].tag}>.`
      );
    }
  }

  if (skippedLevels) {
    score = "warning";
    recommendations.push(
      "Maintain a logical heading hierarchy without skipping levels (e.g., H1 -> H2 -> H3, not H1 -> H3)."
    );
  }

  const levelCounts = {};
  headings.forEach((h) => {
    levelCounts[h.tag] = (levelCounts[h.tag] || 0) + 1;
  });

  if (!skippedLevels && issues.length === 0) {
    issues.push("Heading hierarchy is properly structured.");
  }

  return { score, headings, structure: levelCounts, issues, recommendations };
}

// --- New analyzers ---

function analyzeInternalLinks($, parsedUrl) {
  const hostname = parsedUrl.hostname;
  const links = [];
  const issues = [];
  const recommendations = [];
  let score = "pass";

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const linkUrl = new URL(href, parsedUrl.origin);
      if (linkUrl.hostname === hostname || linkUrl.hostname.endsWith("." + hostname)) {
        links.push({
          href: linkUrl.pathname,
          text: $(el).text().trim().substring(0, 80),
          hasText: $(el).text().trim().length > 0,
        });
      }
    } catch {
      if (href.startsWith("/") || href.startsWith("#") || href.startsWith("./")) {
        links.push({
          href,
          text: $(el).text().trim().substring(0, 80),
          hasText: $(el).text().trim().length > 0,
        });
      }
    }
  });

  const count = links.length;
  const emptyAnchors = links.filter((l) => !l.hasText).length;

  if (count === 0) {
    score = "warning";
    issues.push("No internal links found on the page.");
    recommendations.push("Add internal links to help Google discover and index your other pages.");
  } else {
    issues.push(`Found ${count} internal link${count !== 1 ? "s" : ""}.`);
    if (count < 3) {
      score = "warning";
      recommendations.push("Consider adding more internal links to improve site navigation and SEO.");
    }
  }

  if (emptyAnchors > 0) {
    score = "warning";
    issues.push(`${emptyAnchors} internal link${emptyAnchors !== 1 ? "s have" : " has"} no anchor text.`);
    recommendations.push("Add descriptive anchor text to all internal links for better SEO.");
  }

  // Deduplicate and limit to top links for the response
  const seen = new Set();
  const uniqueLinks = [];
  for (const l of links) {
    if (!seen.has(l.href)) {
      seen.add(l.href);
      uniqueLinks.push(l);
    }
  }

  return { score, count, emptyAnchors, links: uniqueLinks.slice(0, 50), issues, recommendations };
}

function analyzeExternalLinks($, parsedUrl) {
  const hostname = parsedUrl.hostname;
  const links = [];
  const issues = [];
  const recommendations = [];
  let score = "pass";

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const linkUrl = new URL(href, parsedUrl.origin);
      if (
        linkUrl.hostname !== hostname &&
        !linkUrl.hostname.endsWith("." + hostname) &&
        (linkUrl.protocol === "https:" || linkUrl.protocol === "http:")
      ) {
        links.push({
          href: linkUrl.href,
          domain: linkUrl.hostname,
          rel: $(el).attr("rel") || "",
          text: $(el).text().trim().substring(0, 80),
        });
      }
    } catch {
      // skip invalid URLs
    }
  });

  const count = links.length;
  const nofollowCount = links.filter((l) => l.rel.includes("nofollow")).length;
  const uniqueDomains = new Set(links.map((l) => l.domain)).size;

  issues.push(`Found ${count} external link${count !== 1 ? "s" : ""} pointing to ${uniqueDomains} unique domain${uniqueDomains !== 1 ? "s" : ""}.`);

  if (count > 0 && nofollowCount === 0) {
    issues.push("No external links use rel=\"nofollow\".");
    recommendations.push(
      "Consider using rel=\"nofollow\" or rel=\"sponsored\" for paid/untrusted links to manage link equity."
    );
  } else if (nofollowCount > 0) {
    issues.push(`${nofollowCount} external link${nofollowCount !== 1 ? "s use" : " uses"} rel="nofollow".`);
  }

  if (count > 100) {
    score = "warning";
    recommendations.push("Very high number of external links. Ensure they are all relevant and necessary.");
  }

  // Deduplicate and limit for the response
  const seen = new Set();
  const uniqueLinks = [];
  for (const l of links) {
    if (!seen.has(l.href)) {
      seen.add(l.href);
      uniqueLinks.push(l);
    }
  }

  return { score, count, nofollowCount, uniqueDomains, links: uniqueLinks.slice(0, 50), issues, recommendations };
}

function analyzeImages($) {
  const images = [];
  const issues = [];
  const recommendations = [];
  let score = "pass";

  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    const alt = $(el).attr("alt");
    const loading = $(el).attr("loading");
    const ext = src.split("?")[0].split(".").pop()?.toLowerCase() || "";
    images.push({ src: src.substring(0, 120), alt, loading, ext });
  });

  const total = images.length;
  const missingAlt = images.filter((img) => img.alt === undefined || img.alt === null).length;
  const emptyAlt = images.filter((img) => img.alt !== undefined && img.alt !== null && img.alt.trim() === "").length;
  const outdatedFormats = images.filter((img) =>
    ["bmp", "tiff", "tif"].includes(img.ext)
  ).length;
  const modernFormats = images.filter((img) =>
    ["webp", "avif"].includes(img.ext)
  ).length;

  const missingAltImages = images
    .filter((img) => img.alt === undefined || img.alt === null)
    .map((img) => img.src);

  if (total === 0) {
    issues.push("No images found on the page.");
    return { score, total: 0, missingAlt: 0, missingAltImages: [], issues, recommendations };
  }

  issues.push(`Found ${total} image${total !== 1 ? "s" : ""}.`);

  if (missingAlt > 0) {
    score = "fail";
    issues.push(`${missingAlt} image${missingAlt !== 1 ? "s are" : " is"} missing alt text entirely.`);
    recommendations.push("Add descriptive alt text to every image for SEO and accessibility.");
  }

  if (emptyAlt > 0) {
    issues.push(`${emptyAlt} image${emptyAlt !== 1 ? "s have" : " has"} empty alt="" (decorative).`);
  }

  if (missingAlt === 0 && emptyAlt === 0) {
    issues.push("All images have alt text.");
  }

  if (outdatedFormats > 0) {
    score = score === "fail" ? "fail" : "warning";
    issues.push(`${outdatedFormats} image${outdatedFormats !== 1 ? "s use" : " uses"} outdated format (BMP/TIFF).`);
    recommendations.push("Convert images to modern formats like WebP or AVIF for better performance.");
  }

  if (modernFormats > 0) {
    issues.push(`${modernFormats} image${modernFormats !== 1 ? "s use" : " uses"} modern format (WebP/AVIF).`);
  }

  return { score, total, missingAlt, missingAltImages, emptyAlt, outdatedFormats, modernFormats, issues, recommendations };
}

function analyzeSchema($) {
  const schemas = [];
  const issues = [];
  const recommendations = [];
  let score = "pass";

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const type = data["@type"] || (Array.isArray(data["@graph"]) ? "Graph" : "Unknown");
      schemas.push({ type, valid: true });
    } catch {
      schemas.push({ type: "Invalid JSON", valid: false });
    }
  });

  if (schemas.length === 0) {
    score = "warning";
    issues.push("No JSON-LD structured data found.");
    recommendations.push(
      "Add schema markup (JSON-LD) to enable rich snippets. Common types: Organization, WebPage, Article, BreadcrumbList."
    );
  } else {
    const validCount = schemas.filter((s) => s.valid).length;
    const invalidCount = schemas.filter((s) => !s.valid).length;
    const types = schemas.filter((s) => s.valid).map((s) => s.type);

    issues.push(`Found ${schemas.length} JSON-LD block${schemas.length !== 1 ? "s" : ""}: ${types.join(", ") || "none valid"}.`);

    if (invalidCount > 0) {
      score = "warning";
      issues.push(`${invalidCount} schema block${invalidCount !== 1 ? "s have" : " has"} invalid JSON.`);
      recommendations.push("Fix invalid JSON-LD markup to ensure search engines can parse it.");
    }
  }

  return { score, count: schemas.length, schemas, issues, recommendations };
}

function analyzePageSpeed(contentLength, loadTimeMs, $) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const sizeKb = Math.round(contentLength / 1024);
  issues.push(`HTML document size: ${sizeKb} KB.`);
  issues.push(`Server response time: ${loadTimeMs} ms.`);

  if (sizeKb > 100) {
    score = "warning";
    recommendations.push("HTML is large. Consider reducing inline scripts/styles and removing unnecessary code.");
  }

  if (loadTimeMs > 3000) {
    score = "fail";
    issues.push("Server response is slow (over 3 seconds).");
    recommendations.push("Investigate server performance. Aim for under 200ms server response time.");
  } else if (loadTimeMs > 1000) {
    score = score === "fail" ? "fail" : "warning";
    issues.push("Server response is moderate (over 1 second).");
    recommendations.push("Consider caching, CDN, or server optimization to improve response time.");
  } else {
    issues.push("Server response time is good.");
  }

  const scripts = $("script[src]").length;
  const stylesheets = $('link[rel="stylesheet"]').length;
  issues.push(`External resources: ${scripts} scripts, ${stylesheets} stylesheets.`);

  if (scripts + stylesheets > 20) {
    score = score === "fail" ? "fail" : "warning";
    recommendations.push("High number of external resources. Consider bundling or deferring scripts.");
  }

  return { score, sizeKb, loadTimeMs, scripts, stylesheets, issues, recommendations };
}

function analyzeMobile($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const viewport = $('meta[name="viewport"]');
  if (viewport.length === 0) {
    score = "fail";
    issues.push("No viewport meta tag found.");
    recommendations.push('Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile support.');
  } else {
    const content = viewport.attr("content") || "";
    issues.push(`Viewport meta tag found: "${content}".`);

    if (!content.includes("width=device-width")) {
      score = "warning";
      recommendations.push("Viewport should include width=device-width for proper mobile rendering.");
    }

    if (content.includes("maximum-scale=1") || content.includes("user-scalable=no")) {
      score = "warning";
      issues.push("Viewport disables or limits user zooming.");
      recommendations.push("Allow users to zoom for better accessibility. Remove maximum-scale=1 or user-scalable=no.");
    }
  }

  const mobileAlternate = $('link[rel="alternate"][media]');
  if (mobileAlternate.length > 0) {
    issues.push("Mobile-specific alternate link detected (separate mobile site).");
  }

  return { score, hasViewport: viewport.length > 0, issues, recommendations };
}

function analyzeSsl(parsedUrl) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  if (parsedUrl.protocol === "https:") {
    issues.push("Site uses HTTPS. Connection is secure.");
  } else {
    score = "fail";
    issues.push("Site uses HTTP (not secure).");
    recommendations.push("Migrate to HTTPS. It is a confirmed ranking factor and essential for user trust.");
  }

  return { score, isHttps: parsedUrl.protocol === "https:", issues, recommendations };
}

function analyzeOpenGraph($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const requiredTags = ["og:title", "og:description", "og:image", "og:url", "og:type"];
  const found = {};

  $("meta[property^='og:']").each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content")?.trim() || "";
    if (prop) found[prop] = content;
  });

  const foundKeys = Object.keys(found);
  const missing = requiredTags.filter((t) => !found[t]);

  if (foundKeys.length === 0) {
    score = "fail";
    issues.push("No Open Graph tags found.");
    recommendations.push("Add og:title, og:description, og:image, og:url, and og:type for social sharing.");
  } else {
    issues.push(`Found ${foundKeys.length} Open Graph tag${foundKeys.length !== 1 ? "s" : ""}.`);

    if (missing.length > 0) {
      score = "warning";
      issues.push(`Missing: ${missing.join(", ")}.`);
      recommendations.push(`Add the missing OG tags: ${missing.join(", ")}.`);
    }

    if (found["og:image"]) {
      issues.push(`OG image: ${found["og:image"].substring(0, 100)}`);
    }
  }

  return { score, tags: found, missing, issues, recommendations };
}

function analyzeTwitterCards($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const found = {};
  $("meta[name^='twitter:'], meta[property^='twitter:']").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property");
    const content = $(el).attr("content")?.trim() || "";
    if (name) found[name] = content;
  });

  const expectedTags = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"];
  const missing = expectedTags.filter((t) => !found[t]);

  if (Object.keys(found).length === 0) {
    score = "warning";
    issues.push("No Twitter Card meta tags found.");
    recommendations.push("Add twitter:card, twitter:title, twitter:description, and twitter:image for better Twitter/X sharing.");
  } else {
    issues.push(`Found ${Object.keys(found).length} Twitter Card tag${Object.keys(found).length !== 1 ? "s" : ""}.`);

    if (found["twitter:card"]) {
      issues.push(`Card type: ${found["twitter:card"]}.`);
    }

    if (missing.length > 0) {
      score = "warning";
      issues.push(`Missing: ${missing.join(", ")}.`);
      recommendations.push(`Add missing tags: ${missing.join(", ")}.`);
    }
  }

  return { score, tags: found, missing, issues, recommendations };
}

function analyzeCanonical($, pageUrl) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const canonical = $('link[rel="canonical"]');
  if (canonical.length === 0) {
    score = "warning";
    issues.push("No canonical URL tag found.");
    recommendations.push("Add a canonical tag to prevent duplicate content issues and clarify the preferred URL.");
  } else if (canonical.length > 1) {
    score = "warning";
    issues.push(`Found ${canonical.length} canonical tags. There should be exactly one.`);
    recommendations.push("Remove duplicate canonical tags. Only one should exist per page.");
  } else {
    const href = canonical.attr("href")?.trim() || "";
    issues.push(`Canonical URL: ${href}`);

    if (!href) {
      score = "warning";
      issues.push("Canonical tag has an empty href.");
      recommendations.push("Set the canonical href to the preferred URL for this page.");
    } else {
      try {
        const canonicalUrl = new URL(href, pageUrl);
        if (canonicalUrl.href !== pageUrl && canonicalUrl.href !== pageUrl + "/") {
          issues.push("Canonical URL differs from the current page URL.");
        }
      } catch {
        score = "warning";
        issues.push("Canonical URL is not a valid URL.");
      }
    }
  }

  return { score, issues, recommendations };
}

function analyzeRobotsTxt(robotsTxt, origin) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const robotsTxtUrl = origin + "/robots.txt";

  if (!robotsTxt) {
    score = "warning";
    issues.push("No robots.txt file found or it is not properly formatted.");
    recommendations.push("Create a robots.txt file to guide search engine crawlers.");
    return { score, exists: false, robotsTxtUrl, issues, recommendations };
  }

  issues.push("robots.txt file found and accessible.");

  const lines = robotsTxt.split("\n");
  const hasDisallowAll = lines.some(
    (l) => l.trim().toLowerCase() === "disallow: /"
  );
  const hasSitemap = lines.some(
    (l) => l.trim().toLowerCase().startsWith("sitemap:")
  );

  if (hasDisallowAll) {
    score = "fail";
    issues.push("robots.txt blocks all crawling with 'Disallow: /'. Search engines cannot index your site.");
    recommendations.push("Remove or modify the 'Disallow: /' rule to allow search engines to crawl your content.");
  }

  if (!hasSitemap) {
    recommendations.push("Add a Sitemap directive to robots.txt pointing to your sitemap.xml.");
  } else {
    issues.push("Sitemap reference found in robots.txt.");
  }

  return { score, exists: true, robotsTxtUrl, issues, recommendations };
}

function analyzeSitemap(robotsTxt, sitemapExists, origin) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const sitemapUrl = origin + "/sitemap.xml";

  const sitemapInRobots = robotsTxt && /sitemap:/i.test(robotsTxt);

  // Extract sitemap URLs from robots.txt
  const sitemapUrls = [];
  if (robotsTxt) {
    for (const line of robotsTxt.split("\n")) {
      const match = line.match(/^sitemap:\s*(.+)/i);
      if (match) sitemapUrls.push(match[1].trim());
    }
  }
  if (sitemapExists && !sitemapUrls.includes(sitemapUrl)) {
    sitemapUrls.unshift(sitemapUrl);
  }

  if (sitemapExists) {
    issues.push("XML sitemap found at /sitemap.xml.");
  } else if (sitemapInRobots) {
    issues.push("Sitemap referenced in robots.txt but not found at /sitemap.xml.");
    score = "warning";
  } else {
    score = "warning";
    issues.push("No XML sitemap detected.");
    recommendations.push("Create a sitemap.xml to help search engines discover all your pages.");
  }

  if (sitemapInRobots && sitemapExists) {
    issues.push("Sitemap is also referenced in robots.txt.");
  }

  return { score, sitemapExists, sitemapInRobots: !!sitemapInRobots, sitemapUrl, sitemapUrls, issues, recommendations };
}

function analyzeUrlStructure(parsedUrl) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const path = parsedUrl.pathname;
  issues.push(`URL path: ${path}`);

  if (path.length > 75) {
    score = "warning";
    issues.push(`URL path is long (${path.length} characters).`);
    recommendations.push("Keep URL paths concise and descriptive. Shorter URLs tend to perform better.");
  }

  if (/[A-Z]/.test(path)) {
    score = "warning";
    issues.push("URL contains uppercase characters.");
    recommendations.push("Use lowercase-only URLs to avoid duplicate content issues.");
  }

  if (/_/.test(path)) {
    score = "warning";
    issues.push("URL uses underscores. Google recommends hyphens instead.");
    recommendations.push("Replace underscores with hyphens in URLs.");
  }

  if (/[?&]/.test(parsedUrl.search) && parsedUrl.search.length > 50) {
    issues.push("URL has a long query string which may not be SEO-friendly.");
    recommendations.push("Consider using clean URL paths instead of long query parameters.");
    score = "warning";
  }

  if (/\.(html|php|asp|jsp)$/i.test(path)) {
    issues.push("URL contains a file extension. Modern URLs typically omit extensions.");
  }

  if (issues.length <= 1) {
    issues.push("URL structure looks clean and SEO-friendly.");
  }

  return { score, path, issues, recommendations };
}

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "is","it","its","this","that","was","are","be","has","had","have","do","does",
  "did","will","would","could","should","may","might","can","not","no","so",
  "if","from","as","all","been","were","we","they","he","she","you","i","me",
  "my","your","our","their","his","her","us","am","about","more","up","out",
  "also","just","than","then","into","over","what","when","which","who","how",
  "each","other","some","them","these","those","own","such","only","very",
  "same","any","both","after","before","between","through","during","here",
  "there","where","why","new","now","way","because","make","like","back",
  "get","go","see","come","know","take","being","de","en","la","el","les",
  "des","le","du","un","une","et","est","que","qui","dans","pour","par","sur",
  "pas","plus","ce","se","son","au","avec","ne","je","il","nous","vous","ils",
]);

function extractNgrams(words, n, limit) {
  const counts = {};
  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n).join(" ");
    counts[gram] = (counts[gram] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function analyzeContent($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  // Remove scripts/styles to get body text
  const body = $("body").clone();
  body.find("script, style, noscript").remove();
  const text = body.text().replace(/\s+/g, " ").trim();

  const allWords = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = allWords.length;
  issues.push(`Word count: ${wordCount}.`);

  if (wordCount < 300) {
    score = "warning";
    issues.push("Content is thin (under 300 words).");
    recommendations.push("Aim for at least 300+ words of quality content for better rankings.");
  } else if (wordCount >= 300 && wordCount < 600) {
    issues.push("Content length is acceptable but could be more comprehensive.");
  } else {
    issues.push("Content length is good for SEO.");
  }

  // Basic readability: average sentence length
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length > 0) {
    const avgWordsPerSentence = Math.round(wordCount / sentences.length);
    issues.push(`Average sentence length: ${avgWordsPerSentence} words.`);
    if (avgWordsPerSentence > 25) {
      recommendations.push("Sentences are quite long on average. Shorter sentences improve readability.");
    }
  }

  // Check for paragraphs
  const paragraphs = $("p").length;
  issues.push(`${paragraphs} paragraph${paragraphs !== 1 ? "s" : ""} found.`);

  // Keyword / n-gram extraction
  const cleaned = allWords
    .map((w) => w.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F'-]/g, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  // Single keywords
  const kwCounts = {};
  for (const w of cleaned) {
    kwCounts[w] = (kwCounts[w] || 0) + 1;
  }
  const keywords = Object.entries(kwCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  // Multi-word phrases (use cleaned words for 2-gram, lowercased allWords for 3/4-gram to keep context)
  const contextWords = allWords
    .map((w) => w.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F'-]/g, ""))
    .filter((w) => w.length > 1);

  const twoWordPhrases = extractNgrams(contextWords, 2, 15);
  const threeWordPhrases = extractNgrams(contextWords, 3, 15);
  const fourWordPhrases = extractNgrams(contextWords, 4, 10);

  return {
    score,
    wordCount,
    paragraphs,
    keywords,
    twoWordPhrases,
    threeWordPhrases,
    fourWordPhrases,
    issues,
    recommendations,
  };
}

function analyzeAccessibility($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  // Check lang attribute
  const htmlLang = $("html").attr("lang");
  if (!htmlLang) {
    score = "warning";
    issues.push("No lang attribute on <html> element.");
    recommendations.push('Add a lang attribute (e.g., <html lang="en">) for screen readers and SEO.');
  } else {
    issues.push(`Page language: "${htmlLang}".`);
  }

  // Images without alt
  const imgsNoAlt = $("img:not([alt])").length;
  if (imgsNoAlt > 0) {
    score = "fail";
    issues.push(`${imgsNoAlt} image${imgsNoAlt !== 1 ? "s" : ""} missing alt attribute.`);
    recommendations.push("Add alt attributes to all images for screen readers.");
  } else {
    issues.push("All images have alt attributes.");
  }

  // ARIA landmarks
  const ariaRoles = $("[role]").length;
  const ariaLabels = $("[aria-label], [aria-labelledby]").length;
  issues.push(`ARIA: ${ariaRoles} role${ariaRoles !== 1 ? "s" : ""}, ${ariaLabels} label${ariaLabels !== 1 ? "s" : ""} found.`);

  // Form labels
  const inputs = $("input:not([type='hidden']):not([type='submit']):not([type='button'])").length;
  const labels = $("label").length;
  if (inputs > 0 && labels === 0) {
    score = score === "fail" ? "fail" : "warning";
    issues.push(`${inputs} form input${inputs !== 1 ? "s" : ""} found but no <label> elements.`);
    recommendations.push("Associate labels with form inputs for accessibility.");
  }

  // Skip navigation
  const skipLink = $('a[href="#main"], a[href="#content"], a.skip-link, a.skip-to-content').length;
  if (skipLink === 0) {
    recommendations.push("Consider adding a skip navigation link for keyboard users.");
  }

  return { score, issues, recommendations };
}

function analyzeMetaRobots($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const robotsMeta = $('meta[name="robots"]');
  if (robotsMeta.length === 0) {
    issues.push("No meta robots tag found. Search engines will index and follow links by default.");
    return { score, issues, recommendations };
  }

  const content = robotsMeta.attr("content")?.toLowerCase()?.trim() || "";
  issues.push(`Meta robots: "${content}".`);

  if (content.includes("noindex")) {
    score = "fail";
    issues.push("Page is set to noindex. Search engines will not index this page.");
    recommendations.push("Remove noindex if you want this page to appear in search results.");
  }

  if (content.includes("nofollow")) {
    score = score === "fail" ? "fail" : "warning";
    issues.push("Page is set to nofollow. Search engines will not follow links on this page.");
    recommendations.push("Remove nofollow if you want search engines to discover linked pages.");
  }

  if (content.includes("none")) {
    score = "fail";
    issues.push("Meta robots set to 'none' (equivalent to noindex, nofollow).");
  }

  return { score, content, issues, recommendations };
}

function analyzeHreflang($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const hreflangTags = $('link[rel="alternate"][hreflang]');
  if (hreflangTags.length === 0) {
    issues.push("No hreflang tags found. This is only needed for multilingual/multi-regional sites.");
    return { score, count: 0, issues, recommendations };
  }

  const langs = [];
  let hasXDefault = false;
  hreflangTags.each((_, el) => {
    const lang = $(el).attr("hreflang");
    const href = $(el).attr("href");
    langs.push({ lang, href: href?.substring(0, 100) });
    if (lang === "x-default") hasXDefault = true;
  });

  issues.push(`Found ${langs.length} hreflang tag${langs.length !== 1 ? "s" : ""}: ${langs.map((l) => l.lang).join(", ")}.`);

  if (!hasXDefault) {
    score = "warning";
    recommendations.push('Add an x-default hreflang tag as a fallback for unmatched languages.');
  }

  return { score, count: langs.length, langs, issues, recommendations };
}

function analyzeFavicon($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]');
  const appleTouchIcon = $('link[rel="apple-touch-icon"]');

  if (favicon.length === 0) {
    score = "warning";
    issues.push("No favicon link tag found.");
    recommendations.push("Add a favicon for browser tabs and bookmarks branding.");
  } else {
    issues.push(`Favicon found: ${favicon.first().attr("href")?.substring(0, 100) || "(no href)"}`);
  }

  if (appleTouchIcon.length === 0) {
    recommendations.push("Add an Apple touch icon for iOS home screen bookmarks.");
  } else {
    issues.push("Apple touch icon found.");
  }

  return { score, hasFavicon: favicon.length > 0, hasAppleTouchIcon: appleTouchIcon.length > 0, issues, recommendations };
}

function analyzeLazyLoading($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const allImages = $("img");
  const total = allImages.length;

  if (total === 0) {
    issues.push("No images found.");
    return { score, total: 0, lazyCount: 0, issues, recommendations };
  }

  let lazyCount = 0;
  let nativeLazy = 0;
  allImages.each((_, el) => {
    const loading = $(el).attr("loading");
    if (loading === "lazy") {
      nativeLazy++;
      lazyCount++;
    }
    // Check for common JS lazy loading patterns
    const dataSrc = $(el).attr("data-src") || $(el).attr("data-lazy");
    if (dataSrc) lazyCount++;
  });

  issues.push(`${total} image${total !== 1 ? "s" : ""} found, ${lazyCount} use${lazyCount === 1 ? "s" : ""} lazy loading.`);

  if (total > 5 && lazyCount === 0) {
    score = "warning";
    recommendations.push('Add loading="lazy" to below-the-fold images to improve page speed and Core Web Vitals.');
  } else if (lazyCount > 0) {
    issues.push(`${nativeLazy} use${nativeLazy === 1 ? "s" : ""} native loading="lazy".`);
  }

  return { score, total, lazyCount, nativeLazy, issues, recommendations };
}

function analyzeDoctype(html) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const trimmed = html.trimStart().substring(0, 100).toLowerCase();
  if (trimmed.startsWith("<!doctype html")) {
    issues.push("HTML5 DOCTYPE declaration found.");
  } else if (trimmed.startsWith("<!doctype")) {
    score = "warning";
    issues.push("DOCTYPE found but not HTML5 standard.");
    recommendations.push("Use the standard HTML5 DOCTYPE: <!DOCTYPE html>.");
  } else {
    score = "fail";
    issues.push("No DOCTYPE declaration found.");
    recommendations.push("Add <!DOCTYPE html> at the very beginning of the document for proper rendering.");
  }

  return { score, issues, recommendations };
}

function analyzeCharEncoding($, html) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const charsetMeta = $('meta[charset]');
  const httpEquivCharset = $('meta[http-equiv="Content-Type"]');
  let charset = "";

  if (charsetMeta.length > 0) {
    charset = charsetMeta.attr("charset")?.toLowerCase() || "";
    issues.push(`Character encoding declared: ${charset}.`);
  } else if (httpEquivCharset.length > 0) {
    const content = httpEquivCharset.attr("content") || "";
    const match = content.match(/charset=([^\s;]+)/i);
    charset = match ? match[1].toLowerCase() : "";
    issues.push(`Character encoding via http-equiv: ${charset}.`);
  }

  if (!charset) {
    score = "warning";
    issues.push("No character encoding declaration found.");
    recommendations.push('Add <meta charset="utf-8"> in the <head> section.');
  } else if (charset !== "utf-8") {
    score = "warning";
    issues.push(`Encoding is "${charset}" instead of recommended UTF-8.`);
    recommendations.push("Use UTF-8 encoding for maximum compatibility across languages.");
  }

  return { score, charset, issues, recommendations };
}

function analyzeKeywordsInUrl($, parsedUrl) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const title = $("title").text().trim().toLowerCase();
  const path = parsedUrl.pathname.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  if (!title || path === "" || path === " ") {
    issues.push("Cannot analyze keywords in URL (no title or root path).");
    return { score, issues, recommendations };
  }

  const titleWords = title.split(/\s+/).filter((w) => w.length > 3);
  const pathWords = path.split(/\s+/).filter((w) => w.length > 2);

  if (pathWords.length === 0) {
    issues.push("This is the root URL. Keyword-in-URL analysis applies to inner pages.");
    return { score, issues, recommendations };
  }

  const matchingWords = titleWords.filter((w) => pathWords.includes(w));
  const matchPercent = titleWords.length > 0 ? Math.round((matchingWords.length / titleWords.length) * 100) : 0;

  issues.push(`${matchingWords.length} keyword${matchingWords.length !== 1 ? "s" : ""} from the title found in the URL (${matchPercent}%).`);

  if (matchingWords.length > 0) {
    issues.push(`Matching: ${matchingWords.join(", ")}.`);
  }

  if (matchingWords.length === 0 && titleWords.length > 0) {
    score = "warning";
    recommendations.push("Include relevant keywords from your title in the URL slug for better SEO.");
  }

  return { score, matchingWords, matchPercent, issues, recommendations };
}

function analyzeSocialImageSize($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const ogImage = $('meta[property="og:image"]').attr("content")?.trim();
  const ogWidth = $('meta[property="og:image:width"]').attr("content")?.trim();
  const ogHeight = $('meta[property="og:image:height"]').attr("content")?.trim();

  const twitterImage = $('meta[name="twitter:image"], meta[property="twitter:image"]').attr("content")?.trim();

  if (!ogImage && !twitterImage) {
    score = "warning";
    issues.push("No social sharing images found (og:image or twitter:image).");
    recommendations.push("Add og:image and twitter:image tags with properly sized images (1200x630 recommended).");
    return { score, issues, recommendations };
  }

  if (ogImage) {
    issues.push(`OG image: ${ogImage.substring(0, 100)}`);
    if (ogWidth && ogHeight) {
      issues.push(`OG image dimensions declared: ${ogWidth}x${ogHeight}.`);
      const w = parseInt(ogWidth, 10);
      const h = parseInt(ogHeight, 10);
      if (w < 1200 || h < 630) {
        score = "warning";
        recommendations.push("OG image should be at least 1200x630 pixels for optimal display on social platforms.");
      }
    } else {
      recommendations.push("Add og:image:width and og:image:height tags so platforms can render images faster.");
    }
  }

  if (twitterImage) {
    issues.push(`Twitter image: ${twitterImage.substring(0, 100)}`);
  } else if (ogImage) {
    recommendations.push("Add a dedicated twitter:image tag, or Twitter/X will fall back to og:image.");
  }

  return { score, ogImage: !!ogImage, twitterImage: !!twitterImage, issues, recommendations };
}

function analyzeGooglePageSpeed(data) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  if (!data || data.error) {
    const reason = data?.error || "unknown";
    const messages = {
      rate_limited: "Google PageSpeed API rate limit reached. Please wait a moment and try again.",
      timeout: "Google PageSpeed API request timed out. The target page may be too slow or the API is overloaded.",
      api_not_enabled: "PageSpeed Insights API is not enabled. Please enable it in Google Cloud Console.",
    };
    const issueMsg = messages[reason] || "Could not retrieve Google PageSpeed Insights data. The API may be temporarily unavailable.";

    const recs = reason === "api_not_enabled"
      ? [
          "Enable PageSpeed Insights API in your Google Cloud Console",
          "Wait 2-3 minutes after enabling for changes to propagate",
          "Ensure your API key has permission to access PageSpeed Insights API"
        ]
      : [
          "Try analyzing again in a few seconds.",
          "Ensure the URL is publicly accessible (not behind auth or VPN).",
        ];

    return {
      score: "warning",
      performanceScore: null,
      seoScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      metrics: null,
      categories: null,
      issues: [issueMsg],
      recommendations: recs,
    };
  }

  const categories = {};
  const lighthouseCategories = data.lighthouseResult?.categories || {};

  for (const [key, cat] of Object.entries(lighthouseCategories)) {
    const pct = Math.round((cat.score || 0) * 100);
    categories[key] = pct;
  }

  // Performance score
  const perfScore = categories["performance"] ?? null;
  const seoScore = categories["seo"] ?? null;
  const a11yScore = categories["accessibility"] ?? null;
  const bpScore = categories["best-practices"] ?? null;

  if (perfScore !== null) {
    issues.push(`Performance: ${perfScore}/100`);
    if (perfScore < 50) {
      score = "fail";
    } else if (perfScore < 90) {
      score = "warning";
    }
  }

  if (seoScore !== null) {
    issues.push(`SEO: ${seoScore}/100`);
    if (seoScore < 50 && score !== "fail") score = "fail";
    else if (seoScore < 90 && score === "pass") score = "warning";
  }

  if (a11yScore !== null) {
    issues.push(`Accessibility: ${a11yScore}/100`);
  }

  if (bpScore !== null) {
    issues.push(`Best Practices: ${bpScore}/100`);
  }

  // Core Web Vitals from Lighthouse
  const audits = data.lighthouseResult?.audits || {};
  const metrics = {};

  const metricMap = {
    "first-contentful-paint": { label: "First Contentful Paint (FCP)", key: "fcp" },
    "largest-contentful-paint": { label: "Largest Contentful Paint (LCP)", key: "lcp" },
    "total-blocking-time": { label: "Total Blocking Time (TBT)", key: "tbt" },
    "cumulative-layout-shift": { label: "Cumulative Layout Shift (CLS)", key: "cls" },
    "speed-index": { label: "Speed Index", key: "si" },
    "interactive": { label: "Time to Interactive (TTI)", key: "tti" },
  };

  for (const [auditKey, meta] of Object.entries(metricMap)) {
    const audit = audits[auditKey];
    if (audit) {
      metrics[meta.key] = {
        value: audit.numericValue,
        display: audit.displayValue,
        score: audit.score,
      };
      issues.push(`${meta.label}: ${audit.displayValue || "N/A"}`);
    }
  }

  // Recommendations from failed audits
  const opportunityAudits = [
    "render-blocking-resources",
    "uses-optimized-images",
    "uses-responsive-images",
    "unminified-css",
    "unminified-javascript",
    "unused-css-rules",
    "unused-javascript",
    "uses-text-compression",
    "uses-rel-preconnect",
    "efficient-animated-content",
    "offscreen-images",
  ];

  for (const auditKey of opportunityAudits) {
    const audit = audits[auditKey];
    if (audit && audit.score !== null && audit.score < 0.9 && audit.title) {
      recommendations.push(audit.title + (audit.displayValue ? ` (${audit.displayValue})` : ""));
    }
  }

  if (perfScore !== null && perfScore >= 90 && recommendations.length === 0) {
    issues.push("Excellent performance score. No major issues detected.");
  }

  return {
    score,
    performanceScore: perfScore,
    seoScore,
    accessibilityScore: a11yScore,
    bestPracticesScore: bpScore,
    metrics,
    categories,
    issues,
    recommendations,
  };
}

// --- Answer Engine Optimization (AEO) ---

function analyzeAEO($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const signals = [];

  // 1. FAQ schema
  let hasFaqSchema = false;
  let hasHowToSchema = false;
  let hasQASchema = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (/FAQPage/i.test(raw)) hasFaqSchema = true;
      if (/HowTo/i.test(raw)) hasHowToSchema = true;
      if (/"QAPage"|"Question"/i.test(raw)) hasQASchema = true;
    } catch {}
  });
  if (hasFaqSchema) {
    signals.push("FAQPage schema");
    issues.push("FAQPage structured data found — eligible for FAQ rich results.");
  }
  if (hasHowToSchema) {
    signals.push("HowTo schema");
    issues.push("HowTo structured data found — eligible for step-by-step rich results.");
  }
  if (hasQASchema) {
    signals.push("Q&A schema");
    issues.push("Q&A structured data found.");
  }

  // 2. Question headings (H2/H3 with ?)
  const questionHeadings = [];
  $("h2, h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes("?") && text.length > 10) {
      questionHeadings.push(text.substring(0, 100));
    }
  });
  if (questionHeadings.length > 0) {
    signals.push(`${questionHeadings.length} question heading(s)`);
    issues.push(`${questionHeadings.length} question-style heading${questionHeadings.length !== 1 ? "s" : ""} found — good for featured snippets.`);
  }

  // 3. Lists (ol/ul) near headings — snippet-friendly
  const listCount = $("ol, ul").filter((_, el) => {
    return $(el).children("li").length >= 3;
  }).length;
  if (listCount > 0) {
    signals.push(`${listCount} list(s)`);
    issues.push(`${listCount} structured list${listCount !== 1 ? "s" : ""} with 3+ items — favored for list snippets.`);
  }

  // 4. Tables
  const tableCount = $("table").length;
  if (tableCount > 0) {
    signals.push(`${tableCount} table(s)`);
    issues.push(`${tableCount} data table${tableCount !== 1 ? "s" : ""} found — eligible for table snippets.`);
  }

  // 5. Definition patterns (dt/dd or strong + paragraph)
  const dlCount = $("dl").length;
  if (dlCount > 0) {
    signals.push("Definition list(s)");
    issues.push(`${dlCount} definition list${dlCount !== 1 ? "s" : ""} found.`);
  }

  // Score
  if (signals.length === 0) {
    score = "warning";
    issues.push("No answer-engine-friendly content patterns detected.");
    recommendations.push("Add FAQ schema (FAQPage) to help your content appear in featured snippets.");
    recommendations.push("Use question-format headings (e.g., 'What is...?', 'How to...?') followed by concise answers.");
    recommendations.push("Add structured lists or tables for list/table snippet eligibility.");
  } else if (signals.length <= 2 && !hasFaqSchema) {
    score = "warning";
    recommendations.push("Add FAQPage structured data to maximize featured snippet eligibility.");
  }

  return { score, signals, questionHeadings: questionHeadings.slice(0, 10), issues, recommendations };
}

// --- Generative Engine Optimization (GEO) ---

function analyzeGEO($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const signals = [];

  // 1. Author / expertise signals
  const hasAuthor = $('[rel="author"], .author, [itemprop="author"], meta[name="author"]').length > 0;
  if (hasAuthor) {
    signals.push("Author attribution");
    issues.push("Author information found — builds content credibility for AI engines.");
  }

  // 2. Date published / modified
  const hasDatePublished = $('meta[property="article:published_time"], time[datetime], [itemprop="datePublished"]').length > 0;
  const hasDateModified = $('meta[property="article:modified_time"], [itemprop="dateModified"]').length > 0;
  if (hasDatePublished) {
    signals.push("Published date");
    issues.push("Publication date found — AI engines prefer fresh, dated content.");
  }
  if (hasDateModified) {
    signals.push("Modified date");
    issues.push("Last-modified date found.");
  }

  // 3. Citations / references (outbound links with context)
  const outboundLinks = $('a[href^="http"]').filter((_, el) => {
    const href = $(el).attr("href") || "";
    return !href.includes(($("link[rel='canonical']").attr("href") || "").split("/")[2] || "__none__");
  }).length;
  if (outboundLinks >= 3) {
    signals.push(`${outboundLinks} external references`);
    issues.push(`${outboundLinks} outbound citations/references — AI engines value well-sourced content.`);
  }

  // 4. Statistics / data points (numbers with context)
  const body = $("body").clone();
  body.find("script, style, noscript").remove();
  const bodyText = body.text();
  const statPatterns = bodyText.match(/\d+(\.\d+)?%|\$[\d,.]+|\d{1,3}(,\d{3})+/g) || [];
  if (statPatterns.length >= 3) {
    signals.push(`${statPatterns.length} data points`);
    issues.push(`${statPatterns.length} statistical data points found — quantitative content is favored by AI summarizers.`);
  }

  // 5. Comprehensive headings (topic coverage)
  const h2Count = $("h2").length;
  if (h2Count >= 4) {
    signals.push(`${h2Count} topic sections`);
    issues.push(`${h2Count} H2 sections — comprehensive topic coverage helps AI engines understand depth.`);
  }

  // 6. Structured data richness
  const schemaCount = $('script[type="application/ld+json"]').length;
  if (schemaCount >= 2) {
    signals.push("Rich structured data");
    issues.push(`${schemaCount} JSON-LD blocks — rich structured data improves AI extraction accuracy.`);
  }

  // 7. Clear first-paragraph summary
  const firstP = $("article p, main p, .content p, p").first().text().trim();
  if (firstP.length >= 50 && firstP.length <= 300) {
    signals.push("Concise intro paragraph");
    issues.push("Concise introductory paragraph found — ideal for AI-generated summaries.");
  }

  // Score
  if (signals.length <= 1) {
    score = "fail";
    issues.push("Very few GEO signals detected.");
    recommendations.push("Add author attribution and publish dates to establish content authority.");
    recommendations.push("Include statistics, data points, and cite external sources.");
    recommendations.push("Use comprehensive H2 sections covering subtopics for thorough topic coverage.");
    recommendations.push("Add multiple JSON-LD structured data blocks (Article, FAQPage, BreadcrumbList).");
  } else if (signals.length <= 3) {
    score = "warning";
    if (!hasAuthor) recommendations.push("Add author information (name, bio, credentials) to build E-E-A-T signals.");
    if (!hasDatePublished) recommendations.push("Add a published date using article:published_time or datePublished schema.");
    if (outboundLinks < 3) recommendations.push("Cite authoritative external sources to strengthen content trustworthiness.");
    if (h2Count < 4) recommendations.push("Expand content with more H2 subsections for deeper topic coverage.");
  }

  return { score, signals, issues, recommendations };
}

// --- Programmatic SEO (pSEO) ---

function analyzeProgrammaticSeo($, parsedUrl) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const signals = [];

  // 1. Template patterns in title (contains | or - separators with brand)
  const title = $("title").text().trim();
  const hasTitleTemplate = /\s[-|]\s/.test(title);
  if (hasTitleTemplate) {
    signals.push("Title template pattern");
    issues.push("Title uses a separator pattern (e.g., 'Keyword | Brand') — common in pSEO.");
  }

  // 2. URL parameters or pattern-based paths
  const path = parsedUrl.pathname;
  const hasParams = parsedUrl.search.length > 1;
  const hasPatternPath = /\/[\w-]+\/[\w-]+\/[\w-]+/.test(path);
  if (hasParams) {
    signals.push("URL parameters");
    issues.push(`URL has query parameters: ${parsedUrl.search.substring(0, 80)}`);
  }
  if (hasPatternPath) {
    signals.push("Nested URL structure");
    issues.push("Multi-level URL path detected — typical of programmatic page generation.");
  }

  // 3. Pagination (rel next/prev)
  const hasRelNext = $('link[rel="next"]').length > 0;
  const hasRelPrev = $('link[rel="prev"]').length > 0;
  if (hasRelNext || hasRelPrev) {
    signals.push("Pagination links");
    issues.push("Pagination rel=\"next\"/\"prev\" found — indicates paginated content series.");
  }

  // 4. Hreflang (language/region variants — a pSEO signal)
  const hreflangCount = $('link[rel="alternate"][hreflang]').length;
  if (hreflangCount > 2) {
    signals.push(`${hreflangCount} hreflang variants`);
    issues.push(`${hreflangCount} hreflang tags — suggests multi-region programmatic pages.`);
  }

  // 5. Internal link density (many internal links suggest hub/index pages)
  const internalLinkCount = $('a[href^="/"], a[href^="./"]').length;
  if (internalLinkCount > 50) {
    signals.push("High internal link density");
    issues.push(`${internalLinkCount} internal links — may be a hub/index page in a pSEO structure.`);
  }

  // 6. Canonical (self-referencing or not)
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  if (canonical && canonical !== parsedUrl.href && canonical !== parsedUrl.href.replace(/\/$/, "")) {
    signals.push("Cross-canonical");
    issues.push("Canonical URL points to a different page — may indicate variant/duplicate in a pSEO set.");
  }

  // 7. BreadcrumbList schema
  let hasBreadcrumb = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      if (/BreadcrumbList/i.test($(el).html())) hasBreadcrumb = true;
    } catch {}
  });
  if (hasBreadcrumb) {
    signals.push("BreadcrumbList schema");
    issues.push("BreadcrumbList structured data found — supports site hierarchy for pSEO.");
  }

  // Scoring
  if (signals.length === 0) {
    issues.push("No programmatic SEO patterns detected. This appears to be a manually crafted page.");
  } else {
    issues.push(`${signals.length} pSEO signal${signals.length !== 1 ? "s" : ""} detected.`);
  }

  if (hasParams && !canonical) {
    score = "warning";
    recommendations.push("Add canonical tags to parameterized URLs to prevent duplicate content issues.");
  }
  if (signals.length > 0 && !hasBreadcrumb) {
    recommendations.push("Add BreadcrumbList schema to improve navigation visibility in search results.");
  }
  if (signals.length > 0 && hreflangCount === 0 && hasPatternPath) {
    recommendations.push("Consider adding hreflang tags if serving multiple language/region variants.");
  }

  return { score, signals, issues, recommendations };
}

// --- AI Search Visibility ---

function analyzeAISearchVisibility($, robotsTxt) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const signals = [];

  const AI_BOTS = [
    { name: "GPTBot", label: "ChatGPT/OpenAI" },
    { name: "ChatGPT-User", label: "ChatGPT Browse" },
    { name: "Google-Extended", label: "Google AI (Bard/Gemini)" },
    { name: "Amazonbot", label: "Amazon Alexa" },
    { name: "anthropic-ai", label: "Anthropic Claude" },
    { name: "ClaudeBot", label: "ClaudeBot" },
    { name: "PerplexityBot", label: "Perplexity" },
    { name: "Bytespider", label: "ByteDance" },
    { name: "CCBot", label: "Common Crawl" },
  ];

  // 1. Check robots.txt for AI bot directives
  const blockedBots = [];
  const allowedBots = [];
  if (robotsTxt) {
    const lines = robotsTxt.toLowerCase().split("\n");
    let currentAgent = "";
    for (const line of lines) {
      const agentMatch = line.match(/^user-agent:\s*(.+)/);
      if (agentMatch) {
        currentAgent = agentMatch[1].trim();
      }
      const disallowMatch = line.match(/^disallow:\s*\/\s*$/);
      if (disallowMatch) {
        for (const bot of AI_BOTS) {
          if (currentAgent === bot.name.toLowerCase() || currentAgent === "*") {
            if (currentAgent !== "*") blockedBots.push(bot);
          }
        }
      }
    }

    // More specific check: look for explicit bot mentions
    for (const bot of AI_BOTS) {
      const botRegex = new RegExp(`user-agent:\\s*${bot.name}`, "i");
      const blockRegex = new RegExp(`user-agent:\\s*${bot.name}[\\s\\S]*?disallow:\\s*/`, "im");
      if (botRegex.test(robotsTxt)) {
        if (blockRegex.test(robotsTxt) && !blockedBots.find((b) => b.name === bot.name)) {
          blockedBots.push(bot);
        } else if (!blockRegex.test(robotsTxt)) {
          allowedBots.push(bot);
        }
      }
    }
  }

  if (blockedBots.length > 0) {
    signals.push(`${blockedBots.length} AI bot(s) blocked`);
    issues.push(`Blocked AI crawlers: ${blockedBots.map((b) => b.label).join(", ")}.`);
    if (blockedBots.length >= 3) score = "warning";
  }
  if (allowedBots.length > 0) {
    signals.push(`${allowedBots.length} AI bot(s) explicitly mentioned`);
    issues.push(`AI crawlers referenced in robots.txt: ${allowedBots.map((b) => b.label).join(", ")}.`);
  }
  if (blockedBots.length === 0 && allowedBots.length === 0) {
    issues.push("No AI-specific crawler rules in robots.txt — all AI bots can crawl by default.");
  }

  // 2. Meta robots for AI
  const noaiMeta = $('meta[name="robots"]').attr("content") || "";
  if (/noai|noimageai/i.test(noaiMeta)) {
    signals.push("noai meta directive");
    issues.push("Meta robots contains noai/noimageai — restricts AI training use.");
    score = "warning";
  }

  // 3. Structured data quality (AI engines extract from schema)
  const schemaCount = $('script[type="application/ld+json"]').length;
  if (schemaCount > 0) {
    signals.push(`${schemaCount} schema block(s)`);
    issues.push(`${schemaCount} JSON-LD structured data block${schemaCount !== 1 ? "s" : ""} — helps AI engines extract accurate information.`);
  } else {
    recommendations.push("Add JSON-LD structured data so AI engines can extract accurate facts from your page.");
  }

  // 4. Content accessibility (not hidden behind JS)
  const noscriptContent = $("noscript").text().trim().length;
  const bodyTextLength = $("body").text().replace(/\s+/g, " ").trim().length;
  if (bodyTextLength < 200) {
    score = "warning";
    signals.push("Low visible content");
    issues.push("Very little text content visible in HTML — AI crawlers may not execute JavaScript.");
    recommendations.push("Ensure key content is in the initial HTML response, not loaded via client-side JS.");
  } else {
    signals.push("Content in HTML");
    issues.push("Content is present in server-rendered HTML — accessible to AI crawlers.");
  }

  // 5. Clear topic identification
  const h1 = $("h1").first().text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  if (h1 && metaDesc) {
    signals.push("Clear topic signals");
    issues.push("H1 and meta description present — helps AI engines identify page topic.");
  }

  // Score
  if (signals.length <= 1) {
    score = "warning";
    recommendations.push("Improve AI search visibility by adding structured data and ensuring content is server-rendered.");
  }

  return { score, signals, blockedBots: blockedBots.map((b) => b.label), allowedBots: allowedBots.map((b) => b.label), issues, recommendations };
}

// --- Local SEO ---

function analyzeLocalSeo($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const signals = [];

  // 1. LocalBusiness schema
  let hasLocalSchema = false;
  let localSchemaTypes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      const types = ["LocalBusiness", "Restaurant", "Store", "Hotel", "MedicalBusiness",
        "LegalService", "FinancialService", "RealEstateAgent", "Dentist", "Physician",
        "AutoDealer", "BarOrPub", "CafeOrCoffeeShop", "Bakery"];
      for (const t of types) {
        if (raw.includes(`"${t}"`)) {
          hasLocalSchema = true;
          localSchemaTypes.push(t);
        }
      }
    } catch {}
  });
  if (hasLocalSchema) {
    signals.push("LocalBusiness schema");
    issues.push(`Local business schema found: ${localSchemaTypes.join(", ")}.`);
  }

  // 2. NAP detection (Name, Address, Phone)
  const bodyText = $("body").text();
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const hasPhone = phonePattern.test(bodyText) || $('a[href^="tel:"]').length > 0;
  if (hasPhone) {
    signals.push("Phone number");
    issues.push("Phone number detected on page.");
  }

  const hasAddress = $('address, [itemprop="address"], [itemprop="streetAddress"]').length > 0;
  if (hasAddress) {
    signals.push("Address element");
    issues.push("Address markup found on page.");
  }

  // 3. Google Maps embed
  const hasMap = $('iframe[src*="google.com/maps"], iframe[src*="maps.google"]').length > 0;
  if (hasMap) {
    signals.push("Google Maps embed");
    issues.push("Google Maps embed found — strong local signal.");
  }

  // 4. GeoCoordinates
  let hasGeo = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      if (/GeoCoordinates|latitude|longitude/i.test($(el).html())) hasGeo = true;
    } catch {}
  });
  const geoMeta = $('meta[name="geo.position"], meta[name="ICBM"], meta[name="geo.region"]').length > 0;
  if (hasGeo || geoMeta) {
    signals.push("Geo coordinates");
    issues.push("Geographic coordinates or geo meta tags found.");
  }

  // 5. Opening hours
  let hasHours = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      if (/openingHours|OpeningHoursSpecification/i.test($(el).html())) hasHours = true;
    } catch {}
  });
  if (hasHours) {
    signals.push("Opening hours");
    issues.push("Opening hours structured data found.");
  }

  // 6. Local keywords in content
  const localKeywords = ["near me", "local", "directions", "visit us", "our location",
    "hours of operation", "open today", "get directions", "contact us"];
  const lowerBody = bodyText.toLowerCase();
  const foundLocalKw = localKeywords.filter((kw) => lowerBody.includes(kw));
  if (foundLocalKw.length > 0) {
    signals.push(`${foundLocalKw.length} local keyword(s)`);
    issues.push(`Local keywords found: ${foundLocalKw.join(", ")}.`);
  }

  // Scoring
  if (signals.length === 0) {
    issues.push("No local SEO signals detected. This may not be a local business page.");
    // Don't penalize — not every page needs local SEO
  } else if (signals.length <= 2) {
    score = "warning";
    if (!hasLocalSchema) recommendations.push("Add LocalBusiness structured data with name, address, phone, and opening hours.");
    if (!hasAddress) recommendations.push("Add an <address> element or schema markup for your business address.");
    if (!hasGeo && !geoMeta) recommendations.push("Add GeoCoordinates to your LocalBusiness schema for map visibility.");
    if (!hasHours) recommendations.push("Add OpeningHoursSpecification to help search engines show business hours.");
  } else {
    issues.push(`${signals.length} local SEO signals detected — good local optimization.`);
  }

  return { score, signals, issues, recommendations };
}

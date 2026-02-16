import * as cheerio from "cheerio";
import { createAdminClient } from "@/lib/supabase/admin";

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
            "Mozilla/5.0 (compatible; FireflyBot/1.0; +https://firefly.dev)",
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

    // Fetch sitemap, PageSpeed, and llms.txt data in parallel
    const origin = parsedUrl.origin;
    const [sitemapData, pageSpeedData, llmsTxtData] = await Promise.all([
      checkSitemap(origin),
      fetchPageSpeedInsights(normalizedUrl),
      fetchLlmsTxt(origin),
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
      httpsRedirect: await analyzeHttpsRedirect(parsedUrl),
      openGraph: analyzeOpenGraph($),
      twitterCards: analyzeTwitterCards($),
      canonicalUrl: analyzeCanonical($, normalizedUrl),
      sitemapDetection: analyzeSitemap(sitemapData, origin),
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
      aiSearchVisibility: analyzeAISearchVisibility($, null),
      localSeo: analyzeLocalSeo($),
      socialMediaMetaTags: analyzeSocialMediaMetaTags($),
      deprecatedHtmlTags: analyzeDeprecatedHtmlTags($),
      googleAnalytics: analyzeGoogleAnalytics($),
      jsErrors: analyzeJsErrors($, html),
      consoleErrors: analyzeConsoleErrors($),
      htmlCompression: analyzeHtmlCompression(responseHeaders),
      htmlPageSize: analyzeHtmlPageSize(contentLength),
      jsExecutionTime: analyzeJsExecutionTime(pageSpeedData),
      cdnUsage: analyzeCdnUsage($),
      modernImageFormats: analyzeModernImageFormats($),
      llmsTxt: analyzeLlmsTxt(llmsTxtData),
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

async function checkSitemap(origin) {
  // Helper function to try checking sitemap
  async function tryCheck(url) {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": "FireflyBot/1.0" },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow', // Follow redirects
      });
      return res.ok ? res.url : null; // Return final URL if found
    } catch {
      return null;
    }
  }

  const testedUrls = [];

  // Try original URL
  const originalUrl = `${origin}/sitemap.xml`;
  testedUrls.push(originalUrl);
  let foundUrl = await tryCheck(originalUrl);
  if (foundUrl) {
    return {
      exists: true,
      foundAt: foundUrl,
      testedUrls,
    };
  }

  // If failed, try alternative version (with/without www)
  try {
    const parsedOrigin = new URL(origin);
    const hostname = parsedOrigin.hostname;

    let alternativeOrigin;
    if (hostname.startsWith('www.')) {
      // Try without www
      alternativeOrigin = `${parsedOrigin.protocol}//${hostname.substring(4)}`;
    } else {
      // Try with www
      alternativeOrigin = `${parsedOrigin.protocol}//www.${hostname}`;
    }

    const alternativeUrl = `${alternativeOrigin}/sitemap.xml`;
    testedUrls.push(alternativeUrl);
    foundUrl = await tryCheck(alternativeUrl);
    if (foundUrl) {
      return {
        exists: true,
        foundAt: foundUrl,
        testedUrls,
      };
    }
  } catch {
    // Ignore errors in alternative URL attempt
  }

  return {
    exists: false,
    foundAt: null,
    testedUrls,
  };
}

async function getPageSpeedApiKey() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "pagespeed_api_key")
      .single();
    if (data?.value) return data.value;
  } catch {
    // Fallback to env var
  }
  return process.env.PAGESPEED_API_KEY || "";
}

async function fetchPageSpeedInsights(url) {
  const apiKey = await getPageSpeedApiKey();
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

async function fetchLlmsTxt(origin) {
  async function tryFetch(url) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "FireflyBot/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const text = await res.text();
      return text && text.trim().length > 0 ? text : null;
    } catch {
      return null;
    }
  }

  const [llmsTxt, llmsFullTxt] = await Promise.all([
    tryFetch(`${origin}/llms.txt`),
    tryFetch(`${origin}/llms-full.txt`),
  ]);

  return { llmsTxt, llmsFullTxt };
}

function parseLlmsTxt(content) {
  if (!content) return { title: null, description: null, sections: [], linkCount: 0, sectionCount: 0 };

  const lines = content.split("\n");
  let title = null;
  let description = null;
  const sections = [];
  let currentSection = null;
  let linkCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Title: single # at start
    if (!title && /^#\s+/.test(trimmed) && !/^##/.test(trimmed)) {
      title = trimmed.replace(/^#\s+/, "").trim();
      continue;
    }

    // Description: blockquote
    if (!description && /^>\s*/.test(trimmed)) {
      description = trimmed.replace(/^>\s*/, "").trim();
      continue;
    }

    // Section: ##
    if (/^##\s+/.test(trimmed)) {
      currentSection = { title: trimmed.replace(/^##\s+/, "").trim(), links: [] };
      sections.push(currentSection);
      continue;
    }

    // Link: - [Title](URL) or - [Title](URL): description
    const linkMatch = trimmed.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/);
    if (linkMatch) {
      linkCount++;
      if (currentSection) {
        currentSection.links.push({
          title: linkMatch[1],
          url: linkMatch[2],
          description: linkMatch[3] || null,
        });
      }
    }
  }

  return { title, description, sections, linkCount, sectionCount: sections.length };
}

function analyzeLlmsTxt(llmsTxtData) {
  const { llmsTxt, llmsFullTxt } = llmsTxtData;
  const llmsExists = !!llmsTxt;
  const llmsFullExists = !!llmsFullTxt;

  if (!llmsExists && !llmsFullExists) {
    return {
      score: "fail",
      issues: ["No /llms.txt file found.", "No /llms-full.txt file found."],
      recommendations: [
        "Create a /llms.txt file to help LLMs understand your site.",
        "Include a title (#), description (>), sections (##), and markdown links.",
        "Optionally create /llms-full.txt with extended content.",
      ],
      llmsExists: false,
      llmsFullExists: false,
      title: null,
      description: null,
      sections: [],
      linkCount: 0,
      sectionCount: 0,
      llmsTxtSize: 0,
      llmsFullTxtSize: 0,
    };
  }

  const parsed = parseLlmsTxt(llmsTxt);
  const issues = [];
  const recommendations = [];

  if (!llmsExists && llmsFullExists) {
    issues.push("/llms.txt not found, but /llms-full.txt exists.");
    recommendations.push("Create a /llms.txt file as the primary entry point for LLMs.");
  }

  if (llmsExists) {
    if (!parsed.title) {
      issues.push("llms.txt is missing a title (# heading).");
      recommendations.push("Add a # Title as the first heading in your llms.txt.");
    }
    if (!parsed.description) {
      issues.push("llms.txt is missing a description (> blockquote).");
      recommendations.push("Add a > description blockquote after the title.");
    }
    if (parsed.sectionCount === 0) {
      issues.push("llms.txt has no sections (## headings).");
      recommendations.push("Add ## sections to organize your content links.");
    }
    if (parsed.linkCount === 0) {
      issues.push("llms.txt has no markdown links.");
      recommendations.push("Add links in the format: - [Title](URL): description");
    }
  }

  const hasComplete = llmsExists && parsed.title && parsed.description && parsed.sectionCount > 0 && parsed.linkCount > 0;
  const score = hasComplete ? "pass" : (llmsExists || llmsFullExists) ? "warning" : "fail";

  return {
    score,
    issues: issues.length > 0 ? issues : ["llms.txt is well-structured and complete."],
    recommendations: recommendations.length > 0 ? recommendations : ["Your llms.txt file follows best practices."],
    llmsExists,
    llmsFullExists,
    title: parsed.title,
    description: parsed.description,
    sections: parsed.sections,
    linkCount: parsed.linkCount,
    sectionCount: parsed.sectionCount,
    llmsTxtSize: llmsTxt ? new TextEncoder().encode(llmsTxt).length : 0,
    llmsFullTxtSize: llmsFullTxt ? new TextEncoder().encode(llmsFullTxt).length : 0,
  };
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
    issues.push("SSL is enabled. Your website has a secure HTTPS connection.");
  } else {
    score = "fail";
    issues.push("SSL is not enabled. Your website does not use HTTPS.");
    recommendations.push(
      "Enable SSL on your website. SSL encrypts data between your website and visitors, securing sensitive information like passwords and credit cards. Search engines use HTTPS as a ranking signal. In systems like WordPress or Wix, SSL can often be enabled with a simple toggle. For custom websites, you may need a developer to install and configure an SSL certificate."
    );
  }

  return { score, isHttps: parsedUrl.protocol === "https:", issues, recommendations };
}

async function analyzeHttpsRedirect(parsedUrl) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  let redirectsToHttps = false;

  if (parsedUrl.protocol !== "https:") {
    score = "fail";
    issues.push("Your page is served over HTTP (not secure). Cannot verify HTTPS redirect.");
    recommendations.push(
      "First enable SSL on your website, then configure your server to redirect all HTTP traffic to HTTPS. This ensures users and search engines always access the secure version of your site."
    );
    return { score, redirectsToHttps, issues, recommendations };
  }

  // Build the HTTP version of the URL to test redirect
  const httpUrl = parsedUrl.href.replace(/^https:/, "http:");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(httpUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FireflyBot/1.0; +https://firefly.dev)",
      },
    });
    clearTimeout(timeout);

    const location = res.headers.get("location") || "";
    if (res.status >= 300 && res.status < 400 && location.startsWith("https://")) {
      redirectsToHttps = true;
      issues.push("HTTP successfully redirects to HTTPS. Visitors are automatically sent to the secure version.");
    } else if (res.status >= 300 && res.status < 400) {
      score = "warning";
      issues.push(`HTTP redirects to ${location || "another URL"}, but not to an HTTPS version.`);
      recommendations.push(
        "Update your redirect rules to point HTTP traffic to the HTTPS version of your site. This can be done via server configuration or .htaccess rules."
      );
    } else {
      score = "fail";
      issues.push("HTTP version does not redirect to HTTPS. Both HTTP and HTTPS versions may be accessible.");
      recommendations.push(
        "Configure your server to redirect all HTTP requests to HTTPS. In WordPress, use a plugin like Really Simple SSL. In Shopify or Wix, enable forced HTTPS in settings. For custom sites, add redirect rules to your .htaccess or server configuration."
      );
    }
  } catch {
    // HTTP version may not be reachable (some servers block port 80)
    redirectsToHttps = true;
    issues.push("HTTP version is not reachable — likely only HTTPS is served, which is ideal.");
  }

  return { score, redirectsToHttps, issues, recommendations };
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

function analyzeSitemap(sitemapData, origin) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const sitemapUrl = origin + "/sitemap.xml";

  // Extract data from sitemapData
  const sitemapExists = sitemapData?.exists || false;
  const sitemapFoundAt = sitemapData?.foundAt;
  const sitemapTestedUrls = sitemapData?.testedUrls || [];

  const sitemapUrls = [];
  if (sitemapExists && sitemapFoundAt) {
    sitemapUrls.push(sitemapFoundAt);
  }

  if (sitemapExists) {
    if (sitemapFoundAt) {
      issues.push(`XML sitemap found at: ${sitemapFoundAt}`);
      if (sitemapTestedUrls.length > 1) {
        issues.push(`Tested URLs: ${sitemapTestedUrls.join(', ')}`);
      }
    } else {
      issues.push("XML sitemap found at /sitemap.xml.");
    }
  } else {
    score = "warning";
    issues.push("No XML sitemap detected.");
    if (sitemapTestedUrls.length > 0) {
      issues.push(`Tested URLs: ${sitemapTestedUrls.join(', ')}`);
    }
    recommendations.push("Create a sitemap.xml to help search engines discover all your pages.");
    recommendations.push("Ensure the file is accessible at both www and non-www versions of your domain.");
  }

  return {
    score,
    sitemapExists,
    sitemapUrl: sitemapFoundAt || sitemapUrl,
    sitemapUrls,
    testedUrls: sitemapTestedUrls,
    issues,
    recommendations
  };
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

  // 1. Check for AI bot directives (if data is available)
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
    issues.push(`AI crawlers referenced: ${allowedBots.map((b) => b.label).join(", ")}.`);
  }
  if (blockedBots.length === 0 && allowedBots.length === 0) {
    issues.push("No AI-specific crawler restrictions detected — all AI bots can crawl by default.");
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

function analyzeSocialMediaMetaTags($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  // Collect Open Graph tags
  const ogTags = {};
  $("meta[property^='og:']").each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content")?.trim() || "";
    if (prop) ogTags[prop] = content;
  });
  const ogCount = Object.keys(ogTags).length;

  // Collect Twitter Card tags
  const twitterTags = {};
  $("meta[name^='twitter:'], meta[property^='twitter:']").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property");
    const content = $(el).attr("content")?.trim() || "";
    if (name) twitterTags[name] = content;
  });
  const twitterCount = Object.keys(twitterTags).length;

  // Collect article meta tags
  const articleTags = {};
  $("meta[property^='article:']").each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content")?.trim() || "";
    if (prop) articleTags[prop] = content;
  });

  // Check for author meta tag
  const authorMeta = $('meta[name="author"]').attr("content")?.trim() || "";

  const hasOg = ogCount > 0;
  const hasTwitter = twitterCount > 0;
  const hasArticle = Object.keys(articleTags).length > 0;
  const hasAuthor = authorMeta.length > 0;
  const totalSocialTags = ogCount + twitterCount + Object.keys(articleTags).length + (hasAuthor ? 1 : 0);

  if (totalSocialTags === 0) {
    score = "fail";
    issues.push("This webpage is not using social media meta tags.");
    recommendations.push("Add Open Graph tags (og:title, og:description, og:image, og:url, og:type) for Facebook, LinkedIn, and other platforms.");
    recommendations.push("Add Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image) for better Twitter/X sharing.");
    recommendations.push("Consider adding article metadata (article:author, article:published_time) if this is a content page.");
  } else {
    if (hasOg) {
      issues.push(`${ogCount} Open Graph tag${ogCount !== 1 ? "s" : ""} found.`);
    } else {
      issues.push("No Open Graph tags found.");
      recommendations.push("Add Open Graph tags (og:title, og:description, og:image, og:url, og:type) for Facebook and LinkedIn sharing.");
    }

    if (hasTwitter) {
      issues.push(`${twitterCount} Twitter Card tag${twitterCount !== 1 ? "s" : ""} found.`);
    } else {
      issues.push("No Twitter Card tags found.");
      recommendations.push("Add Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image) for Twitter/X sharing.");
    }

    if (hasArticle) {
      issues.push(`Article metadata found: ${Object.keys(articleTags).join(", ")}.`);
    }

    if (hasAuthor) {
      issues.push(`Author meta tag found: ${authorMeta}.`);
    }

    if (!hasOg || !hasTwitter) {
      score = "warning";
    }
  }

  return { score, ogCount, twitterCount, articleTags, authorMeta, issues, recommendations };
}

function analyzeDeprecatedHtmlTags($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const deprecatedTags = [
    { tag: "font", reason: "Use CSS font-family, font-size, color instead." },
    { tag: "center", reason: "Use CSS text-align: center or flexbox instead." },
    { tag: "marquee", reason: "Use CSS animations instead." },
    { tag: "blink", reason: "This tag is obsolete and unsupported." },
    { tag: "big", reason: "Use CSS font-size instead." },
    { tag: "strike", reason: "Use <del> or CSS text-decoration: line-through instead." },
    { tag: "tt", reason: "Use <code> or CSS font-family: monospace instead." },
    { tag: "frame", reason: "Use <iframe> or modern layout techniques." },
    { tag: "frameset", reason: "Use modern HTML layout instead." },
    { tag: "noframes", reason: "No longer needed without frames." },
    { tag: "applet", reason: "Use <object> or <embed> instead." },
    { tag: "acronym", reason: "Use <abbr> instead." },
    { tag: "dir", reason: "Use <ul> instead." },
    { tag: "isindex", reason: "Use <form> and <input> instead." },
    { tag: "basefont", reason: "Use CSS for font styling." },
  ];

  const found = [];
  for (const { tag, reason } of deprecatedTags) {
    const count = $(tag).length;
    if (count > 0) {
      found.push({ tag: `<${tag}>`, count, reason });
    }
  }

  // Check deprecated attributes
  const deprecatedAttrs = [];
  const bgElements = $("[bgcolor]").length;
  if (bgElements > 0) deprecatedAttrs.push({ attr: "bgcolor", count: bgElements });
  const alignElements = $("[align]").not("td, th, tr, table, col, colgroup").length;
  if (alignElements > 0) deprecatedAttrs.push({ attr: "align", count: alignElements });
  const borderElements = $("img[border], table[border]").length;
  if (borderElements > 0) deprecatedAttrs.push({ attr: "border", count: borderElements });

  if (found.length === 0 && deprecatedAttrs.length === 0) {
    issues.push("This webpage does not use HTML deprecated tags.");
  } else {
    score = "warning";
    for (const { tag, count, reason } of found) {
      issues.push(`Found ${count} ${tag} element${count !== 1 ? "s" : ""}. ${reason}`);
    }
    for (const { attr, count } of deprecatedAttrs) {
      issues.push(`Found ${count} element${count !== 1 ? "s" : ""} using deprecated "${attr}" attribute.`);
    }
    recommendations.push("Replace deprecated HTML tags and attributes with modern CSS equivalents.");
    if (found.length > 3) {
      score = "fail";
      recommendations.push("A large number of deprecated elements found. Consider a comprehensive code cleanup.");
    }
  }

  return { score, deprecatedTags: found, deprecatedAttrs, issues, recommendations };
}

function analyzeGoogleAnalytics($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  let hasGA4 = false;
  let hasUA = false;
  let hasGTM = false;
  let gaIds = [];

  // Check for GA4 (gtag.js)
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src.includes("googletagmanager.com/gtag/js")) {
      hasGA4 = true;
      const idMatch = src.match(/id=(G-[A-Z0-9]+|UA-\d+-\d+)/);
      if (idMatch) gaIds.push(idMatch[1]);
    }
    if (src.includes("googletagmanager.com/gtm.js")) {
      hasGTM = true;
      const idMatch = src.match(/id=(GTM-[A-Z0-9]+)/);
      if (idMatch) gaIds.push(idMatch[1]);
    }
    if (src.includes("google-analytics.com/analytics.js")) {
      hasUA = true;
    }
    if (src.includes("google-analytics.com/ga.js")) {
      hasUA = true;
    }
  });

  // Check inline scripts for GA code
  $("script:not([src])").each((_, el) => {
    const text = $(el).html() || "";
    if (/gtag\s*\(\s*['"]config['"]/.test(text)) {
      hasGA4 = true;
      const matches = text.match(/G-[A-Z0-9]+/g);
      if (matches) gaIds.push(...matches);
    }
    if (/ga\s*\(\s*['"]create['"]/.test(text) || /\_gaq\.push/i.test(text)) {
      hasUA = true;
    }
    if (/GTM-[A-Z0-9]+/.test(text)) {
      hasGTM = true;
      const matches = text.match(/GTM-[A-Z0-9]+/g);
      if (matches) gaIds.push(...matches);
    }
  });

  gaIds = [...new Set(gaIds)];

  if (hasGA4 || hasGTM) {
    issues.push("This webpage is using Google Analytics.");
    if (hasGA4) issues.push("Google Analytics 4 (gtag.js) detected.");
    if (hasGTM) issues.push("Google Tag Manager detected.");
    if (hasUA) {
      issues.push("Legacy Universal Analytics (UA) also detected.");
      recommendations.push("Universal Analytics has been sunset. Ensure GA4 is properly configured as the primary.");
      score = "warning";
    }
    if (gaIds.length > 0) issues.push(`Tracking ID(s): ${gaIds.join(", ")}.`);
  } else if (hasUA) {
    score = "warning";
    issues.push("Only legacy Universal Analytics detected (no GA4).");
    recommendations.push("Migrate to Google Analytics 4 — Universal Analytics has been sunset by Google.");
  } else {
    score = "warning";
    issues.push("No Google Analytics tracking code detected.");
    recommendations.push("Add Google Analytics 4 or Google Tag Manager to track visitor behavior and measure SEO performance.");
  }

  return { score, hasGA4, hasUA, hasGTM, gaIds, issues, recommendations };
}

function analyzeJsErrors($, html) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const errors = [];

  // Check for inline scripts with potential issues
  $("script:not([src])").each((_, el) => {
    const text = $(el).html() || "";

    // Check for document.write (deprecated, causes issues)
    if (/document\.write\s*\(/.test(text)) {
      errors.push("document.write() usage detected — can cause rendering issues and is blocked in some browsers.");
    }

    // Check for eval usage
    if (/\beval\s*\(/.test(text)) {
      errors.push("eval() usage detected — security risk and performance concern.");
    }
  });

  // Check for scripts with empty src
  const emptySrcScripts = $("script[src=''], script[src=' ']").length;
  if (emptySrcScripts > 0) {
    errors.push(`${emptySrcScripts} script tag${emptySrcScripts !== 1 ? "s" : ""} with empty src attribute — will cause failed network requests.`);
  }

  // Check for HTTP scripts on HTTPS page (mixed content)
  let mixedContentScripts = 0;
  $("script[src^='http:']").each(() => mixedContentScripts++);
  if (mixedContentScripts > 0) {
    errors.push(`${mixedContentScripts} script${mixedContentScripts !== 1 ? "s" : ""} loaded over HTTP (mixed content) — will be blocked by modern browsers.`);
  }

  // Check for onerror handlers (indicates expected errors)
  const onerrorHandlers = $("[onerror]").length;
  if (onerrorHandlers > 0) {
    errors.push(`${onerrorHandlers} element${onerrorHandlers !== 1 ? "s" : ""} with inline onerror handlers.`);
  }

  // Check total inline script count
  const inlineScripts = $("script:not([src])").length;
  const externalScripts = $("script[src]").length;

  if (errors.length === 0) {
    issues.push("No JavaScript errors detected in static analysis.");
    issues.push(`${inlineScripts} inline script${inlineScripts !== 1 ? "s" : ""}, ${externalScripts} external script${externalScripts !== 1 ? "s" : ""} found.`);
  } else {
    score = errors.length >= 3 ? "fail" : "warning";
    issues.push(`Found ${errors.length} potential JavaScript issue${errors.length !== 1 ? "s" : ""}.`);
    issues.push(...errors);
    recommendations.push("Fix JavaScript errors to improve page functionality and user experience.");
    if (mixedContentScripts > 0) {
      recommendations.push("Update all script sources to use HTTPS to resolve mixed content issues.");
    }
  }

  return { score, errorCount: errors.length, inlineScripts, externalScripts, issues, recommendations };
}

function analyzeConsoleErrors($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";
  const warnings = [];

  // Mixed content (HTTP resources on HTTPS page)
  let mixedContent = 0;
  $("img[src^='http:'], link[href^='http:'], script[src^='http:'], iframe[src^='http:']").each(() => mixedContent++);
  if (mixedContent > 0) {
    warnings.push(`${mixedContent} resource${mixedContent !== 1 ? "s" : ""} loaded over HTTP (mixed content warning).`);
  }

  // Missing favicon
  const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  if (!hasFavicon) {
    warnings.push("Missing favicon — browsers will log a 404 error for /favicon.ico.");
  }

  // Broken image patterns (empty src or placeholder)
  const brokenImages = $("img[src=''], img[src=' '], img:not([src])").length;
  if (brokenImages > 0) {
    warnings.push(`${brokenImages} image${brokenImages !== 1 ? "s" : ""} with missing or empty src attribute.`);
  }

  // Forms with action issues
  const formsNoAction = $("form:not([action])").length;
  if (formsNoAction > 0) {
    warnings.push(`${formsNoAction} form${formsNoAction !== 1 ? "s" : ""} without an action attribute.`);
  }

  // Duplicate IDs
  const ids = {};
  $("[id]").each((_, el) => {
    const id = $(el).attr("id");
    if (id) ids[id] = (ids[id] || 0) + 1;
  });
  const duplicateIds = Object.entries(ids).filter(([, c]) => c > 1);
  if (duplicateIds.length > 0) {
    warnings.push(`${duplicateIds.length} duplicate element ID${duplicateIds.length !== 1 ? "s" : ""} found (${duplicateIds.slice(0, 3).map(([id]) => `"${id}"`).join(", ")}${duplicateIds.length > 3 ? "..." : ""}).`);
  }

  // Empty links
  const emptyLinks = $('a[href=""], a[href="#"], a[href="javascript:void(0)"], a[href="javascript:;"]').length;
  if (emptyLinks > 0) {
    warnings.push(`${emptyLinks} link${emptyLinks !== 1 ? "s" : ""} with empty or void href.`);
  }

  if (warnings.length === 0) {
    issues.push("No common console error patterns detected.");
  } else {
    score = warnings.length >= 3 ? "fail" : "warning";
    issues.push(`Found ${warnings.length} potential console issue${warnings.length !== 1 ? "s" : ""}.`);
    issues.push(...warnings);
    if (mixedContent > 0) recommendations.push("Update all resource URLs to HTTPS to eliminate mixed content warnings.");
    if (duplicateIds.length > 0) recommendations.push("Ensure all element IDs are unique — duplicate IDs cause JavaScript errors.");
    if (brokenImages > 0) recommendations.push("Fix images with missing or empty src attributes.");
    if (emptyLinks > 0) recommendations.push("Replace empty href links with proper URLs or button elements.");
  }

  return { score, warningCount: warnings.length, issues, recommendations };
}

function analyzeHtmlCompression(responseHeaders) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const encoding = responseHeaders["content-encoding"] || "";
  const transferEncoding = responseHeaders["transfer-encoding"] || "";

  if (encoding.includes("br")) {
    issues.push("HTML compression is enabled using Brotli (br) — the most efficient compression method.");
  } else if (encoding.includes("gzip")) {
    issues.push("HTML compression is enabled using GZIP.");
    recommendations.push("Consider upgrading to Brotli compression for even better compression ratios (10-25% smaller).");
  } else if (encoding.includes("deflate")) {
    issues.push("HTML compression is enabled using Deflate.");
    score = "warning";
    recommendations.push("Upgrade to GZIP or Brotli compression for better performance.");
  } else {
    score = "fail";
    issues.push("HTML compression (GZIP/Brotli) is not enabled.");
    recommendations.push("Enable GZIP or Brotli compression on your server to reduce transfer size by 60-80%.");
    recommendations.push("Most web servers (Nginx, Apache, Cloudflare) support GZIP/Brotli with simple configuration.");
  }

  return { score, encoding: encoding || "none", issues, recommendations };
}

function analyzeHtmlPageSize(contentLength) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const sizeKb = Math.round(contentLength / 1024);
  const sizeMb = (contentLength / (1024 * 1024)).toFixed(2);

  issues.push(`HTML page size: ${sizeKb} KB (${sizeMb} MB).`);

  if (sizeKb <= 33) {
    issues.push("HTML size is excellent — under 33 KB (ideal for first-round-trip delivery).");
  } else if (sizeKb <= 100) {
    issues.push("HTML size is good.");
  } else if (sizeKb <= 250) {
    score = "warning";
    issues.push("HTML size is moderate. Consider reducing inline content.");
    recommendations.push("Move inline CSS and JavaScript to external files to reduce HTML size.");
    recommendations.push("Remove unnecessary HTML comments and whitespace.");
  } else if (sizeKb <= 500) {
    score = "warning";
    issues.push("HTML size is large — may impact initial page load.");
    recommendations.push("Reduce HTML size by removing inline styles, scripts, and unnecessary markup.");
    recommendations.push("Consider lazy loading content below the fold.");
  } else {
    score = "fail";
    issues.push("HTML size is very large — will significantly impact page load time.");
    recommendations.push("Urgently reduce HTML page size. Move inline resources to external files.");
    recommendations.push("Implement server-side rendering optimizations or pagination for large content.");
    recommendations.push("Consider whether all content needs to be in the initial HTML response.");
  }

  return { score, sizeKb, sizeMb: parseFloat(sizeMb), issues, recommendations };
}

function analyzeJsExecutionTime(pageSpeedData) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  if (!pageSpeedData || pageSpeedData.error) {
    issues.push("Could not measure JavaScript execution time — PageSpeed data unavailable.");
    return { score: "warning", totalBlockingTime: null, scriptEvaluation: null, issues, recommendations: ["Try again when Google PageSpeed API is available."] };
  }

  const audits = pageSpeedData.lighthouseResult?.audits || {};

  // Total Blocking Time
  const tbt = audits["total-blocking-time"];
  const tbtMs = tbt?.numericValue || 0;
  issues.push(`Total Blocking Time: ${tbt?.displayValue || `${Math.round(tbtMs)} ms`}.`);

  // Script evaluation
  const bootup = audits["bootup-time"];
  if (bootup) {
    issues.push(`JavaScript execution time: ${bootup.displayValue || "N/A"}.`);
    if (bootup.score !== null && bootup.score < 0.5) {
      score = "fail";
      recommendations.push("Reduce JavaScript execution time — scripts are blocking the main thread for too long.");
    } else if (bootup.score !== null && bootup.score < 0.9) {
      score = "warning";
    }
  }

  // Main thread work
  const mainThread = audits["mainthread-work-breakdown"];
  if (mainThread) {
    issues.push(`Main thread work: ${mainThread.displayValue || "N/A"}.`);
  }

  // Third-party script impact
  const thirdParty = audits["third-party-summary"];
  if (thirdParty && thirdParty.displayValue) {
    issues.push(`Third-party code impact: ${thirdParty.displayValue}.`);
  }

  if (tbtMs > 600) {
    if (score !== "fail") score = "fail";
    recommendations.push("Total Blocking Time exceeds 600ms. Break up long tasks and defer non-critical JavaScript.");
  } else if (tbtMs > 300) {
    if (score === "pass") score = "warning";
    recommendations.push("Total Blocking Time is moderate. Consider code splitting and deferring non-essential scripts.");
  } else if (score === "pass") {
    issues.push("JavaScript execution time is within acceptable limits.");
  }

  if (recommendations.length === 0 && score !== "pass") {
    recommendations.push("Optimize JavaScript by removing unused code, code splitting, and deferring non-critical scripts.");
  }

  return { score, totalBlockingTime: tbtMs, issues, recommendations };
}

function analyzeCdnUsage($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const knownCdns = [
    { pattern: "cloudflare", name: "Cloudflare" },
    { pattern: "cdn.jsdelivr.net", name: "jsDelivr" },
    { pattern: "cdnjs.cloudflare.com", name: "cdnjs" },
    { pattern: "unpkg.com", name: "unpkg" },
    { pattern: "ajax.googleapis.com", name: "Google CDN" },
    { pattern: "fonts.googleapis.com", name: "Google Fonts" },
    { pattern: "fonts.gstatic.com", name: "Google Fonts Static" },
    { pattern: "cdn.bootcdn.net", name: "BootCDN" },
    { pattern: "stackpath.bootstrapcdn.com", name: "StackPath/Bootstrap CDN" },
    { pattern: "maxcdn.bootstrapcdn.com", name: "MaxCDN/Bootstrap CDN" },
    { pattern: "cdn.cloudflare.com", name: "Cloudflare CDN" },
    { pattern: "akamai", name: "Akamai" },
    { pattern: "fastly", name: "Fastly" },
    { pattern: "cloudfront.net", name: "AWS CloudFront" },
    { pattern: "azureedge.net", name: "Azure CDN" },
    { pattern: "b-cdn.net", name: "BunnyCDN" },
    { pattern: "cdn.statically.io", name: "Statically" },
    { pattern: "cdn77", name: "CDN77" },
    { pattern: "keycdn.com", name: "KeyCDN" },
  ];

  const resourceUrls = new Set();
  $("script[src], link[href], img[src]").each((_, el) => {
    const url = $(el).attr("src") || $(el).attr("href") || "";
    if (url.startsWith("http")) resourceUrls.add(url);
  });

  const cdnsFound = new Set();
  let cdnResourceCount = 0;

  for (const url of resourceUrls) {
    for (const cdn of knownCdns) {
      if (url.toLowerCase().includes(cdn.pattern)) {
        cdnsFound.add(cdn.name);
        cdnResourceCount++;
        break;
      }
    }
  }

  const totalResources = resourceUrls.size;
  const cdnList = [...cdnsFound];

  if (cdnList.length > 0) {
    issues.push(`${cdnResourceCount} resource${cdnResourceCount !== 1 ? "s" : ""} served via CDN${cdnList.length !== 1 ? "s" : ""}: ${cdnList.join(", ")}.`);
    issues.push(`${totalResources} total external resource${totalResources !== 1 ? "s" : ""} detected.`);
  } else if (totalResources > 0) {
    score = "warning";
    issues.push(`${totalResources} external resource${totalResources !== 1 ? "s" : ""} detected, but none appear to be served via a CDN.`);
    recommendations.push("Consider serving static resources (JS, CSS, images) through a CDN for faster global delivery.");
    recommendations.push("Popular CDN options: Cloudflare, AWS CloudFront, Fastly, BunnyCDN.");
  } else {
    issues.push("No external resources detected — page appears to be self-contained.");
  }

  return { score, cdnsFound: cdnList, cdnResourceCount, totalResources, issues, recommendations };
}

function analyzeModernImageFormats($) {
  const issues = [];
  const recommendations = [];
  let score = "pass";

  const images = [];
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    const ext = src.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
    images.push({ src: src.substring(0, 120), ext });
  });

  // Also check <source> elements in <picture>
  $("picture source[srcset]").each((_, el) => {
    const type = $(el).attr("type") || "";
    const srcset = $(el).attr("srcset") || "";
    const ext = srcset.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
    images.push({ src: srcset.substring(0, 120), ext, type });
  });

  const total = images.length;
  const modernFormats = ["webp", "avif"];
  const legacyFormats = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif"];
  const svgCount = images.filter((img) => img.ext === "svg" || img.type === "image/svg+xml").length;
  const modernCount = images.filter((img) => modernFormats.includes(img.ext) || img.type?.includes("webp") || img.type?.includes("avif")).length;
  const legacyCount = images.filter((img) => legacyFormats.includes(img.ext)).length;

  // Check for <picture> elements with modern format sources
  const pictureElements = $("picture").length;

  if (total === 0) {
    issues.push("No images found on the page.");
    return { score, total: 0, modernCount: 0, legacyCount: 0, issues, recommendations };
  }

  issues.push(`${total} image${total !== 1 ? "s" : ""} found.`);

  if (modernCount > 0) {
    issues.push(`${modernCount} image${modernCount !== 1 ? "s" : ""} using modern formats (WebP/AVIF).`);
  }
  if (legacyCount > 0) {
    issues.push(`${legacyCount} image${legacyCount !== 1 ? "s" : ""} using legacy formats (JPEG/PNG/GIF).`);
  }
  if (svgCount > 0) {
    issues.push(`${svgCount} SVG image${svgCount !== 1 ? "s" : ""} (vector format).`);
  }
  if (pictureElements > 0) {
    issues.push(`${pictureElements} <picture> element${pictureElements !== 1 ? "s" : ""} with format fallbacks.`);
  }

  if (legacyCount > 0 && modernCount === 0) {
    score = "warning";
    recommendations.push("Convert images to WebP or AVIF format for 25-50% smaller file sizes.");
    recommendations.push("Use <picture> elements with <source> for WebP/AVIF with JPEG/PNG fallbacks.");
    if (legacyCount > 5) {
      score = "fail";
      recommendations.push("A large number of images use legacy formats. Prioritize converting the largest images first.");
    }
  } else if (legacyCount > 0 && modernCount > 0) {
    score = "warning";
    issues.push("Mix of modern and legacy image formats detected.");
    recommendations.push("Convert remaining legacy format images to WebP or AVIF for optimal performance.");
  }

  return { score, total, modernCount, legacyCount, svgCount, pictureElements, issues, recommendations };
}

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

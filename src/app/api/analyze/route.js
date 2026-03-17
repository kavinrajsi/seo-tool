import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Stopwords for keyword extraction
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any",
  "are","aren't","as","at","be","because","been","before","being","below",
  "between","both","but","by","can","can't","cannot","could","couldn't","did",
  "didn't","do","does","doesn't","doing","don't","down","during","each","few",
  "for","from","further","get","got","had","hadn't","has","hasn't","have",
  "haven't","having","he","he'd","he'll","he's","her","here","here's","hers",
  "herself","him","himself","his","how","how's","i","i'd","i'll","i'm","i've",
  "if","in","into","is","isn't","it","it's","its","itself","just","let's","me",
  "might","more","most","mustn't","my","myself","no","nor","not","of","off",
  "on","once","only","or","other","ought","our","ours","ourselves","out","over",
  "own","per","same","shan't","she","she'd","she'll","she's","should",
  "shouldn't","so","some","such","than","that","that's","the","their","theirs",
  "them","themselves","then","there","there's","these","they","they'd",
  "they'll","they're","they've","this","those","through","to","too","under",
  "until","up","us","very","was","wasn't","we","we'd","we'll","we're","we've",
  "were","weren't","what","what's","when","when's","where","where's","which",
  "while","who","who's","whom","why","why's","will","with","won't","would",
  "wouldn't","you","you'd","you'll","you're","you've","your","yours",
  "yourself","yourselves","also","like","just","one","two","new","use","used",
  "using","will","may","well","back","even","still","way","take","come","make",
  "know","say","said","get","go","see","look","think","thing","things","much",
  "many","good","great","first","last","long","big","little","right","old",
  "high","different","small","large","next","early","young","important",
  "public","already","made","find","work","part","people","day","year","time",
  "site","page","click","home","help","contact","read","need","want","try",
]);

// Known CDN domains
const CDN_DOMAINS = [
  "cdn.jsdelivr.net","cdnjs.cloudflare.com","unpkg.com","ajax.googleapis.com",
  "fonts.googleapis.com","fonts.gstatic.com","maxcdn.bootstrapcdn.com",
  "stackpath.bootstrapcdn.com","cdn.bootcdn.net","cdn.staticfile.org",
  "code.jquery.com","cdn.cloudflare.com","fastly.net","akamaized.net",
  "cloudfront.net","azureedge.net","b-cdn.net","cdn77.org",
];

// Deprecated HTML tags
const DEPRECATED_TAGS = [
  "font","center","marquee","blink","frame","frameset","noframes","strike",
  "big","tt",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safe fetch wrapper with timeout — never throws, returns null on failure.
 */
async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEOToolBot/1.0; +https://seo-tool.dev)",
        ...opts.headers,
      },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
      ...opts,
    });
    return res;
  } catch {
    return null;
  }
}

/**
 * Extract visible-text keywords from body text. Returns array of { word, count }.
 */
function extractKeywords(text, limit = 20) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

/**
 * Build a check object in the canonical shape.
 */
function check({ name, status, weight, category, value, message }) {
  return {
    name,
    status,          // 'pass' | 'warning' | 'fail'
    pass: status !== "fail",
    weight,
    category,
    value: value ?? null,
    message: message ?? "",
  };
}

// ---------------------------------------------------------------------------
// llms.txt analyser (unchanged)
// ---------------------------------------------------------------------------
async function analyzeLlmsTxt(siteUrl) {
  const origin = new URL(siteUrl).origin;
  const result = { exists: false, valid: false, raw: null, issues: [] };

  try {
    const res = await fetch(`${origin}/llms.txt`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOToolBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      result.issues.push("llms.txt not found — AI search engines cannot read your site context");
      return result;
    }

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (contentType.includes("text/html") || text.trim().startsWith("<!")) {
      result.issues.push("URL returns HTML instead of a plain text file");
      return result;
    }

    result.exists = true;
    result.raw = text;

    const lines = text.split("\n");
    const trimmedLines = lines.map((l) => l.trimEnd());
    let issueCount = 0;

    const firstNonEmpty = trimmedLines.find((l) => l.trim() !== "");
    if (!firstNonEmpty || !firstNonEmpty.match(/^# .+/)) {
      result.issues.push("Must start with a top-level heading: # Your Site Name");
      issueCount++;
    }

    const hasBlockquote = trimmedLines.some((l) => l.startsWith("> "));
    if (!hasBlockquote) {
      result.issues.push("Missing blockquote description (> A short summary of your site)");
      issueCount++;
    }

    const sectionHeadings = trimmedLines.filter((l) => l.match(/^## .+/));
    if (sectionHeadings.length === 0) {
      result.issues.push("No ## section headings found — content should be organized into sections");
      issueCount++;
    }

    const hasLinks = text.match(/\[.+?\]\(.+?\)/);
    if (!hasLinks) {
      result.issues.push("No markdown links found — include links to key pages like [About](/about)");
      issueCount++;
    }

    const h1Count = trimmedLines.filter((l) => l.match(/^# [^#]/)).length;
    if (h1Count > 1) {
      result.issues.push(`Found ${h1Count} top-level headings — only one # heading is allowed`);
      issueCount++;
    }

    const contentLines = trimmedLines.filter((l) => l.trim() !== "");
    if (contentLines.length < 3) {
      result.issues.push("File is too short — add a title, description, and at least one section");
      issueCount++;
    }

    if (text.match(/<[a-z][\s\S]*>/i)) {
      result.issues.push("Contains HTML tags — llms.txt should be plain markdown only");
      issueCount++;
    }

    result.valid = issueCount === 0;
  } catch {
    result.issues.push("Could not fetch llms.txt — connection failed or timed out");
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize the URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http")) {
      targetUrl = "https://" + targetUrl;
    }

    const parsedUrl = new URL(targetUrl);
    const origin = parsedUrl.origin;
    const domain = parsedUrl.hostname;

    // -----------------------------------------------------------------------
    // Fetch the page
    // -----------------------------------------------------------------------
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEOToolBot/1.0; +https://seo-tool.dev)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: HTTP ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Capture response metadata before body is consumed
    const wasRedirected = response.redirected || false;
    const contentEncoding = response.headers.get("content-encoding") || "";
    const hstsHeader = response.headers.get("strict-transport-security") || "";

    // -----------------------------------------------------------------------
    // Extract SEO data (existing)
    // -----------------------------------------------------------------------
    const title = $("title").text().trim();
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const metaKeywords = $('meta[name="keywords"]').attr("content") || "";
    const canonical = $('link[rel="canonical"]').attr("href") || "";
    const metaRobots = $('meta[name="robots"]').attr("content") || "";

    // Headings
    const h1s = $("h1").map((_, el) => $(el).text().trim()).get();
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;

    // Images
    const totalImages = $("img").length;
    const imagesWithAlt = $("img[alt]").filter(
      (_, el) => $(el).attr("alt").trim() !== ""
    ).length;

    // Links
    const allLinks = $("a[href]").length;
    const internalLinks = $(
      `a[href^="/"], a[href*="${domain}"]`
    ).length;
    const externalLinks = allLinks - internalLinks;

    // Open Graph
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogDescription = $('meta[property="og:description"]').attr("content") || "";
    const ogImage = $('meta[property="og:image"]').attr("content") || "";

    // Twitter Card
    const twitterCard = $('meta[name="twitter:card"]').attr("content") || "";

    // Word count (body text)
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

    // Viewport meta
    const hasViewport = $('meta[name="viewport"]').length > 0;

    // Language
    const lang = $("html").attr("lang") || "";

    // -----------------------------------------------------------------------
    // New extractions
    // -----------------------------------------------------------------------

    // Charset
    const charsetTag =
      $('meta[charset]').length > 0 ||
      $('meta[http-equiv="Content-Type"]').length > 0;

    // HTML size
    const htmlSizeBytes = Buffer.byteLength(html, "utf8");
    const htmlSizeKB = Math.round((htmlSizeBytes / 1024) * 100) / 100;

    // DOM size
    const domNodeCount = $("*").length;

    // Deprecated tags
    const foundDeprecated = [];
    for (const tag of DEPRECATED_TAGS) {
      if ($(tag).length > 0) foundDeprecated.push(tag);
    }

    // Meta refresh
    const hasMetaRefresh = $('meta[http-equiv="refresh"]').length > 0;

    // Robots directives
    const robotsContent = metaRobots.toLowerCase();
    const hasNoindex = robotsContent.includes("noindex");
    const hasNofollow = robotsContent.includes("nofollow");

    // HTTPS
    const isHttps = targetUrl.startsWith("https");

    // Images: responsive & modern formats
    const imgElements = $("img");
    let responsiveCount = 0;
    let modernFormatCount = 0;
    let legacyFormatCount = 0;
    const imgSrcs = [];

    imgElements.each((_, el) => {
      const src = $(el).attr("src") || "";
      const srcset = $(el).attr("srcset") || "";
      const sizes = $(el).attr("sizes") || "";
      imgSrcs.push(src);

      if (srcset || sizes) responsiveCount++;

      const imgUrl = src.toLowerCase().split("?")[0];
      if (imgUrl.endsWith(".webp") || imgUrl.endsWith(".avif")) {
        modernFormatCount++;
      } else if (imgUrl.endsWith(".jpg") || imgUrl.endsWith(".jpeg") || imgUrl.endsWith(".png") || imgUrl.endsWith(".gif") || imgUrl.endsWith(".bmp")) {
        legacyFormatCount++;
      }
    });

    // Mixed content
    let mixedContentCount = 0;
    if (isHttps) {
      $('img[src^="http://"], script[src^="http://"], link[href^="http://"]').each(() => {
        mixedContentCount++;
      });
    }

    // Unsafe cross-origin links
    let unsafeCrossOriginCount = 0;
    $('a[target="_blank"]').each((_, el) => {
      const rel = ($(el).attr("rel") || "").toLowerCase();
      if (!rel.includes("noopener") && !rel.includes("noreferrer")) {
        unsafeCrossOriginCount++;
      }
    });

    // Plaintext emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = [...new Set((html.match(emailRegex) || []))];

    // Structured data
    const ldJsonScripts = $('script[type="application/ld+json"]');
    const structuredDataTypes = [];
    ldJsonScripts.each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json["@type"]) structuredDataTypes.push(json["@type"]);
        if (Array.isArray(json["@graph"])) {
          for (const item of json["@graph"]) {
            if (item["@type"]) structuredDataTypes.push(item["@type"]);
          }
        }
      } catch { /* ignore malformed JSON-LD */ }
    });

    // Favicon
    const hasFavicon =
      $('link[rel="icon"]').length > 0 ||
      $('link[rel="shortcut icon"]').length > 0 ||
      $('link[rel="apple-touch-icon"]').length > 0;

    // Render-blocking resources
    const headScripts = $("head script");
    let renderBlockingCount = 0;
    headScripts.each((_, el) => {
      const src = $(el).attr("src");
      const async = $(el).attr("async");
      const defer = $(el).attr("defer");
      const type = ($(el).attr("type") || "").toLowerCase();
      if (src && async === undefined && defer === undefined && type !== "module" && type !== "application/ld+json" && type !== "application/json") {
        renderBlockingCount++;
      }
    });

    // JS minification — external scripts
    const allScriptSrcs = [];
    $("script[src]").each((_, el) => allScriptSrcs.push($(el).attr("src")));
    const jsMinCount = allScriptSrcs.filter((s) => s.includes(".min.")).length;

    // CSS minification — external stylesheets
    const allCssHrefs = [];
    $('link[rel="stylesheet"][href]').each((_, el) => allCssHrefs.push($(el).attr("href")));
    const cssMinCount = allCssHrefs.filter((h) => h.includes(".min.")).length;

    // CDN usage
    const allResourceUrls = [...allScriptSrcs, ...allCssHrefs, ...imgSrcs];
    const cdnResources = allResourceUrls.filter((u) =>
      CDN_DOMAINS.some((cdn) => u.includes(cdn))
    );

    // Keywords
    const keywordsTop20 = extractKeywords(bodyText, 20);
    const keywordsTop10 = keywordsTop20.slice(0, 10);
    const top3Words = keywordsTop10.slice(0, 3).map((k) => k.word);
    const titleLower = title.toLowerCase();
    const descLower = metaDescription.toLowerCase();
    const keywordsInTitleAndDesc = top3Words.filter(
      (w) => titleLower.includes(w) && descLower.includes(w)
    );

    // -----------------------------------------------------------------------
    // External fetches — run in parallel via Promise.allSettled
    // -----------------------------------------------------------------------
    const [
      llmsTxtResult,
      robotsTxtResult,
      adsTxtResult,
      custom404Result,
      spfResult,
    ] = await Promise.allSettled([
      analyzeLlmsTxt(targetUrl),
      safeFetch(`${origin}/robots.txt`),
      safeFetch(`${origin}/ads.txt`),
      safeFetch(`${origin}/_seo_tool_check_404_${Date.now()}`),
      safeFetch(`https://dns.google/resolve?name=${domain}&type=TXT`),
    ]);

    // llms.txt
    const llmsTxt =
      llmsTxtResult.status === "fulfilled"
        ? llmsTxtResult.value
        : { exists: false, valid: false, raw: null, issues: ["Check failed"] };

    // robots.txt
    let robotsTxtExists = false;
    let robotsTxtBody = "";
    let robotsDisallowPaths = [];
    if (robotsTxtResult.status === "fulfilled" && robotsTxtResult.value) {
      const rRes = robotsTxtResult.value;
      if (rRes.ok) {
        robotsTxtBody = await rRes.text().catch(() => "");
        robotsTxtExists = robotsTxtBody.trim().length > 0;
        const disallowMatches = robotsTxtBody.match(/^Disallow:\s*(.+)$/gim) || [];
        robotsDisallowPaths = disallowMatches.map((m) =>
          m.replace(/^Disallow:\s*/i, "").trim()
        );
      }
    }

    // ads.txt
    let adsTxtExists = false;
    if (adsTxtResult.status === "fulfilled" && adsTxtResult.value) {
      const aRes = adsTxtResult.value;
      if (aRes.ok) {
        const aBody = await aRes.text().catch(() => "");
        adsTxtExists = aBody.trim().length > 0;
      }
    }

    // custom 404
    let hasCustom404 = false;
    if (custom404Result.status === "fulfilled" && custom404Result.value) {
      const cRes = custom404Result.value;
      // We consider it custom if the response is non-200 AND body has >500 chars of HTML
      if (cRes.status === 404) {
        const body404 = await cRes.text().catch(() => "");
        hasCustom404 = body404.length > 500;
      }
    }

    // SPF records
    let hasSpf = false;
    if (spfResult.status === "fulfilled" && spfResult.value) {
      try {
        const spfJson = await spfResult.value.json();
        if (spfJson?.Answer) {
          hasSpf = spfJson.Answer.some((a) =>
            (a.data || "").toLowerCase().includes("v=spf1")
          );
        }
      } catch { /* ignore */ }
    }

    // -----------------------------------------------------------------------
    // Build checks array
    // -----------------------------------------------------------------------
    const checks = [
      // ---- ON-PAGE (existing checks, migrated) ----
      check({
        name: "Has title",
        status: title.length > 0 ? "pass" : "fail",
        weight: 10,
        category: "on-page",
        value: title || null,
        message: title.length > 0 ? `Title found: "${title}"` : "Missing <title> tag",
      }),
      check({
        name: "Title length (30-60 chars)",
        status: title.length >= 30 && title.length <= 60 ? "pass" : title.length > 0 ? "warning" : "fail",
        weight: 5,
        category: "on-page",
        value: title.length,
        message:
          title.length >= 30 && title.length <= 60
            ? `Title length is ${title.length} characters (optimal)`
            : `Title length is ${title.length} characters (recommended: 30-60)`,
      }),
      check({
        name: "Has meta description",
        status: metaDescription.length > 0 ? "pass" : "fail",
        weight: 10,
        category: "on-page",
        value: metaDescription || null,
        message: metaDescription.length > 0 ? "Meta description found" : "Missing meta description",
      }),
      check({
        name: "Description length (120-160 chars)",
        status:
          metaDescription.length >= 120 && metaDescription.length <= 160
            ? "pass"
            : metaDescription.length > 0
            ? "warning"
            : "fail",
        weight: 5,
        category: "on-page",
        value: metaDescription.length,
        message:
          metaDescription.length >= 120 && metaDescription.length <= 160
            ? `Description length is ${metaDescription.length} characters (optimal)`
            : `Description length is ${metaDescription.length} characters (recommended: 120-160)`,
      }),
      check({
        name: "Has H1",
        status: h1s.length > 0 ? "pass" : "fail",
        weight: 10,
        category: "on-page",
        value: h1s,
        message: h1s.length > 0 ? `Found H1: "${h1s[0]}"` : "No H1 heading found",
      }),
      check({
        name: "Single H1",
        status: h1s.length === 1 ? "pass" : h1s.length === 0 ? "fail" : "warning",
        weight: 5,
        category: "on-page",
        value: h1s.length,
        message:
          h1s.length === 1
            ? "Page has exactly one H1"
            : `Page has ${h1s.length} H1 tags (recommended: exactly 1)`,
      }),
      check({
        name: "Has H2 tags",
        status: h2Count > 0 ? "pass" : "warning",
        weight: 5,
        category: "on-page",
        value: h2Count,
        message: h2Count > 0 ? `Found ${h2Count} H2 tags` : "No H2 headings found",
      }),
      check({
        name: "Has canonical URL",
        status: canonical.length > 0 ? "pass" : "warning",
        weight: 5,
        category: "on-page",
        value: canonical || null,
        message: canonical.length > 0 ? `Canonical: ${canonical}` : "No canonical URL specified",
      }),
      check({
        name: "Has Open Graph title",
        status: ogTitle.length > 0 ? "pass" : "warning",
        weight: 5,
        category: "on-page",
        value: ogTitle || null,
        message: ogTitle.length > 0 ? "OG title found" : "Missing og:title",
      }),
      check({
        name: "Has Open Graph description",
        status: ogDescription.length > 0 ? "pass" : "warning",
        weight: 5,
        category: "on-page",
        value: ogDescription || null,
        message: ogDescription.length > 0 ? "OG description found" : "Missing og:description",
      }),
      check({
        name: "Has Open Graph image",
        status: ogImage.length > 0 ? "pass" : "warning",
        weight: 5,
        category: "on-page",
        value: ogImage || null,
        message: ogImage.length > 0 ? "OG image found" : "Missing og:image",
      }),
      check({
        name: "Has viewport meta",
        status: hasViewport ? "pass" : "fail",
        weight: 5,
        category: "on-page",
        value: hasViewport,
        message: hasViewport ? "Viewport meta tag found" : "Missing viewport meta tag — page may not render well on mobile",
      }),
      check({
        name: "Has lang attribute",
        status: lang.length > 0 ? "pass" : "warning",
        weight: 5,
        category: "on-page",
        value: lang || null,
        message: lang.length > 0 ? `Language: ${lang}` : "Missing lang attribute on <html>",
      }),

      // ---- CONTENT ----
      check({
        name: "Word count > 300",
        status: wordCount >= 300 ? "pass" : "warning",
        weight: 10,
        category: "content",
        value: wordCount,
        message:
          wordCount >= 300
            ? `Word count: ${wordCount}`
            : `Word count is ${wordCount} (recommended: at least 300 for SEO)`,
      }),
      check({
        name: "Has llms.txt",
        status: llmsTxt.exists ? "pass" : "warning",
        weight: 5,
        category: "content",
        value: llmsTxt.exists,
        message: llmsTxt.exists
          ? "llms.txt found"
          : "No llms.txt found — AI search engines cannot read your site context",
      }),
      check({
        name: "llms.txt properly formatted",
        status: llmsTxt.valid ? "pass" : llmsTxt.exists ? "warning" : "fail",
        weight: 5,
        category: "content",
        value: llmsTxt.valid,
        message: llmsTxt.valid
          ? "llms.txt is properly formatted"
          : llmsTxt.exists
          ? `llms.txt has issues: ${llmsTxt.issues.join("; ")}`
          : "llms.txt not found",
      }),
      check({
        name: "mostCommonKeywords",
        status: keywordsTop10.length > 0 ? "pass" : "warning",
        weight: 0,
        category: "content",
        value: keywordsTop10,
        message:
          keywordsTop10.length > 0
            ? `Top keywords: ${keywordsTop10.map((k) => k.word).join(", ")}`
            : "Could not extract keywords from page content",
      }),
      check({
        name: "keywordsUsage",
        status:
          top3Words.length === 0
            ? "warning"
            : keywordsInTitleAndDesc.length >= top3Words.length
            ? "pass"
            : keywordsInTitleAndDesc.length > 0
            ? "warning"
            : "fail",
        weight: 4,
        category: "content",
        value: { top3: top3Words, inTitleAndDesc: keywordsInTitleAndDesc },
        message:
          top3Words.length === 0
            ? "Not enough content to extract keywords"
            : keywordsInTitleAndDesc.length >= top3Words.length
            ? "Top keywords appear in title and meta description"
            : `Only ${keywordsInTitleAndDesc.length}/${top3Words.length} top keywords found in title & description`,
      }),
      check({
        name: "keywordsCloud",
        status: keywordsTop20.length > 0 ? "pass" : "warning",
        weight: 0,
        category: "content",
        value: keywordsTop20,
        message:
          keywordsTop20.length > 0
            ? `${keywordsTop20.length} keywords extracted`
            : "No keywords extracted",
      }),

      // ---- TECHNICAL ----
      check({
        name: "charsetDeclaration",
        status: charsetTag ? "pass" : "fail",
        weight: 7,
        category: "technical",
        value: charsetTag,
        message: charsetTag ? "Charset declaration found" : "Missing <meta charset> declaration",
      }),
      check({
        name: "htmlPageSize",
        status: htmlSizeKB <= 100 ? "pass" : "warning",
        weight: 3,
        category: "technical",
        value: htmlSizeKB,
        message:
          htmlSizeKB <= 100
            ? `HTML size: ${htmlSizeKB} KB`
            : `HTML size is ${htmlSizeKB} KB (recommended: under 100 KB)`,
      }),
      check({
        name: "domSize",
        status: domNodeCount <= 1500 ? "pass" : "warning",
        weight: 3,
        category: "technical",
        value: domNodeCount,
        message:
          domNodeCount <= 1500
            ? `DOM has ${domNodeCount} nodes`
            : `DOM has ${domNodeCount} nodes (recommended: under 1500)`,
      }),
      check({
        name: "deprecatedHtmlTags",
        status: foundDeprecated.length === 0 ? "pass" : "warning",
        weight: 2,
        category: "technical",
        value: foundDeprecated,
        message:
          foundDeprecated.length === 0
            ? "No deprecated HTML tags found"
            : `Deprecated tags found: ${foundDeprecated.join(", ")}`,
      }),
      check({
        name: "metaRefresh",
        status: hasMetaRefresh ? "warning" : "pass",
        weight: 2,
        category: "technical",
        value: hasMetaRefresh,
        message: hasMetaRefresh
          ? "Meta refresh tag detected — may hurt SEO and user experience"
          : "No meta refresh tag found",
      }),
      check({
        name: "noindexTag",
        status: hasNoindex ? "warning" : "pass",
        weight: 1,
        category: "technical",
        value: hasNoindex,
        message: hasNoindex
          ? "Page has noindex directive — it will not appear in search results"
          : "No noindex directive found",
      }),
      check({
        name: "nofollowTag",
        status: hasNofollow ? "warning" : "pass",
        weight: 1,
        category: "technical",
        value: hasNofollow,
        message: hasNofollow
          ? "Page has nofollow directive — search engines will not follow links"
          : "No nofollow directive found",
      }),
      check({
        name: "httpsTest",
        status: isHttps ? "pass" : "fail",
        weight: 10,
        category: "technical",
        value: isHttps,
        message: isHttps ? "Page served over HTTPS" : "Page not served over HTTPS — insecure",
      }),
      check({
        name: "hstsTest",
        status: hstsHeader ? "pass" : "warning",
        weight: 5,
        category: "technical",
        value: hstsHeader || null,
        message: hstsHeader
          ? "Strict-Transport-Security header found"
          : "Missing HSTS header — consider adding Strict-Transport-Security",
      }),
      check({
        name: "gzipTest",
        status:
          contentEncoding.includes("gzip") || contentEncoding.includes("br")
            ? "pass"
            : "warning",
        weight: 5,
        category: "technical",
        value: contentEncoding || null,
        message:
          contentEncoding.includes("gzip") || contentEncoding.includes("br")
            ? `Compression enabled: ${contentEncoding}`
            : "No gzip/brotli compression detected",
      }),
      check({
        name: "urlRedirects",
        status: wasRedirected ? "warning" : "pass",
        weight: 2,
        category: "technical",
        value: wasRedirected,
        message: wasRedirected
          ? "URL was redirected — verify the redirect chain is necessary"
          : "No redirect detected",
      }),

      // ---- IMAGES ----
      check({
        name: "All images have alt text",
        status:
          totalImages === 0 || imagesWithAlt === totalImages ? "pass" : "fail",
        weight: 10,
        category: "images",
        value: { total: totalImages, withAlt: imagesWithAlt },
        message:
          totalImages === 0
            ? "No images found"
            : imagesWithAlt === totalImages
            ? `All ${totalImages} images have alt text`
            : `${totalImages - imagesWithAlt} of ${totalImages} images missing alt text`,
      }),
      check({
        name: "responsiveImages",
        status:
          totalImages === 0
            ? "pass"
            : responsiveCount > 0
            ? responsiveCount === totalImages
              ? "pass"
              : "warning"
            : "fail",
        weight: 3,
        category: "images",
        value: { responsive: responsiveCount, total: totalImages },
        message:
          totalImages === 0
            ? "No images to check"
            : responsiveCount === totalImages
            ? "All images use srcset/sizes for responsiveness"
            : `${responsiveCount}/${totalImages} images have srcset/sizes attributes`,
      }),
      check({
        name: "modernImageFormat",
        status:
          totalImages === 0
            ? "pass"
            : legacyFormatCount === 0
            ? "pass"
            : modernFormatCount > 0
            ? "warning"
            : "warning",
        weight: 3,
        category: "images",
        value: { modern: modernFormatCount, legacy: legacyFormatCount },
        message:
          totalImages === 0
            ? "No images to check"
            : legacyFormatCount === 0
            ? "All images use modern formats (WebP/AVIF)"
            : `${legacyFormatCount} images use legacy formats (JPG/PNG) — consider WebP or AVIF`,
      }),

      // ---- SECURITY ----
      check({
        name: "mixedContent",
        status: mixedContentCount === 0 ? "pass" : "fail",
        weight: 5,
        category: "security",
        value: mixedContentCount,
        message:
          mixedContentCount === 0
            ? "No mixed content detected"
            : `${mixedContentCount} resources loaded over insecure HTTP on HTTPS page`,
      }),
      check({
        name: "unsafeCrossOriginLinks",
        status: unsafeCrossOriginCount === 0 ? "pass" : "warning",
        weight: 4,
        category: "security",
        value: unsafeCrossOriginCount,
        message:
          unsafeCrossOriginCount === 0
            ? "All target=\"_blank\" links have rel=\"noopener\" or rel=\"noreferrer\""
            : `${unsafeCrossOriginCount} links with target="_blank" missing rel="noopener/noreferrer"`,
      }),
      check({
        name: "plaintextEmails",
        status: foundEmails.length === 0 ? "pass" : "warning",
        weight: 2,
        category: "security",
        value: foundEmails,
        message:
          foundEmails.length === 0
            ? "No plaintext email addresses found in HTML"
            : `${foundEmails.length} plaintext email(s) found — consider obfuscation to prevent spam`,
      }),
      check({
        name: "spfRecords",
        status: hasSpf ? "pass" : "warning",
        weight: 2,
        category: "security",
        value: hasSpf,
        message: hasSpf
          ? "SPF record found for domain"
          : "No SPF record detected — email spoofing protection may be missing",
      }),

      // ---- STRUCTURED-DATA ----
      check({
        name: "structuredData",
        status: structuredDataTypes.length > 0 ? "pass" : "warning",
        weight: 3,
        category: "structured-data",
        value: structuredDataTypes,
        message:
          structuredDataTypes.length > 0
            ? `Structured data found: ${structuredDataTypes.join(", ")}`
            : "No JSON-LD structured data found",
      }),
      check({
        name: "faviconTest",
        status: hasFavicon ? "pass" : "warning",
        weight: 3,
        category: "structured-data",
        value: hasFavicon,
        message: hasFavicon ? "Favicon found" : "No favicon link tag found",
      }),
      check({
        name: "adsTxt",
        status: adsTxtExists ? "pass" : "warning",
        weight: 1,
        category: "structured-data",
        value: adsTxtExists,
        message: adsTxtExists
          ? "ads.txt found"
          : "No ads.txt found (only needed if running ads)",
      }),
      check({
        name: "robotsTxt",
        status: robotsTxtExists ? "pass" : "warning",
        weight: 3,
        category: "structured-data",
        value: robotsTxtExists,
        message: robotsTxtExists
          ? "robots.txt found"
          : "No robots.txt found — search engines may have trouble crawling",
      }),
      check({
        name: "robotsDisallowDirective",
        status: "pass",
        weight: 0,
        category: "structured-data",
        value: robotsDisallowPaths,
        message:
          robotsDisallowPaths.length > 0
            ? `Disallow paths: ${robotsDisallowPaths.join(", ")}`
            : "No Disallow directives found in robots.txt",
      }),
      check({
        name: "custom404Page",
        status: hasCustom404 ? "pass" : "warning",
        weight: 2,
        category: "structured-data",
        value: hasCustom404,
        message: hasCustom404
          ? "Custom 404 page detected"
          : "No custom 404 page detected — consider adding one for better UX",
      }),

      // ---- RESOURCES ----
      check({
        name: "renderBlockingResources",
        status: renderBlockingCount === 0 ? "pass" : "warning",
        weight: 4,
        category: "resources",
        value: renderBlockingCount,
        message:
          renderBlockingCount === 0
            ? "No render-blocking scripts in <head>"
            : `${renderBlockingCount} render-blocking script(s) in <head> without async/defer`,
      }),
      check({
        name: "jsMinification",
        status:
          allScriptSrcs.length === 0
            ? "pass"
            : jsMinCount > 0
            ? "pass"
            : "warning",
        weight: 2,
        category: "resources",
        value: { minified: jsMinCount, total: allScriptSrcs.length },
        message:
          allScriptSrcs.length === 0
            ? "No external scripts found"
            : jsMinCount > 0
            ? `${jsMinCount}/${allScriptSrcs.length} scripts appear minified`
            : "No minified scripts detected (.min.) — consider minifying JS",
      }),
      check({
        name: "cssMinification",
        status:
          allCssHrefs.length === 0
            ? "pass"
            : cssMinCount > 0
            ? "pass"
            : "warning",
        weight: 2,
        category: "resources",
        value: { minified: cssMinCount, total: allCssHrefs.length },
        message:
          allCssHrefs.length === 0
            ? "No external stylesheets found"
            : cssMinCount > 0
            ? `${cssMinCount}/${allCssHrefs.length} stylesheets appear minified`
            : "No minified stylesheets detected (.min.) — consider minifying CSS",
      }),
      check({
        name: "cdnUsage",
        status: cdnResources.length > 0 ? "pass" : "warning",
        weight: 2,
        category: "resources",
        value: { cdnCount: cdnResources.length, totalResources: allResourceUrls.length },
        message:
          cdnResources.length > 0
            ? `${cdnResources.length} resources served from CDN`
            : "No known CDN usage detected — consider a CDN for static assets",
      }),
    ];

    // -----------------------------------------------------------------------
    // Scoring
    // -----------------------------------------------------------------------
    const maxScore = checks.reduce((sum, c) => sum + c.weight, 0);
    const earnedScore = checks.reduce(
      (sum, c) => sum + (c.pass ? c.weight : 0),
      0
    );
    const score = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

    // Per-category scores
    const categoryMap = {};
    for (const c of checks) {
      const cat = c.category;
      if (!categoryMap[cat]) categoryMap[cat] = { earned: 0, max: 0 };
      categoryMap[cat].max += c.weight;
      if (c.pass) categoryMap[cat].earned += c.weight;
    }
    const category_scores = {};
    for (const [cat, { earned, max }] of Object.entries(categoryMap)) {
      category_scores[cat] = {
        earned,
        max,
        pct: max > 0 ? Math.round((earned / max) * 100) : 100,
      };
    }

    // -----------------------------------------------------------------------
    // Build response (backward-compatible)
    // -----------------------------------------------------------------------
    const analysis = {
      url: targetUrl,
      title,
      meta_description: metaDescription,
      meta_keywords: metaKeywords,
      canonical,
      meta_robots: metaRobots,
      h1s,
      h2_count: h2Count,
      h3_count: h3Count,
      total_images: totalImages,
      images_with_alt: imagesWithAlt,
      all_links: allLinks,
      internal_links: internalLinks,
      external_links: externalLinks,
      og_title: ogTitle,
      og_description: ogDescription,
      og_image: ogImage,
      twitter_card: twitterCard,
      word_count: wordCount,
      has_viewport: hasViewport,
      lang,
      llms_txt: llmsTxt,
      // New fields
      keywords: keywordsTop10,
      keyword_cloud: keywordsTop20,
      structured_data_types: structuredDataTypes,
      robots_disallow_paths: robotsDisallowPaths,
      html_size_kb: htmlSizeKB,
      dom_node_count: domNodeCount,
      // Checks & scores
      checks,
      score,
      category_scores,
      analyzed_at: new Date().toISOString(),
    };

    // Save to Supabase
    const { error: dbError } = await supabase
      .from("seo_analyses")
      .insert({
        url: targetUrl,
        score,
        data: analysis,
      });

    if (dbError) {
      console.error("Supabase insert error:", dbError.message);
    }

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to analyze URL" },
      { status: 500 }
    );
  }
}

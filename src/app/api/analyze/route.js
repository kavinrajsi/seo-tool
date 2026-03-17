import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

/**
 * Fetch and validate a site's llms.txt file against the llmstxt.org spec.
 * Returns: { exists, valid, raw, issues[] }
 */
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

    // Must be text, not HTML
    if (contentType.includes("text/html") || text.trim().startsWith("<!")) {
      result.issues.push("URL returns HTML instead of a plain text file");
      return result;
    }

    result.exists = true;
    result.raw = text;

    const lines = text.split("\n");
    const trimmedLines = lines.map((l) => l.trimEnd());
    let issueCount = 0;

    // 1. Must start with H1 title: # Title
    const firstNonEmpty = trimmedLines.find((l) => l.trim() !== "");
    if (!firstNonEmpty || !firstNonEmpty.match(/^# .+/)) {
      result.issues.push("Must start with a top-level heading: # Your Site Name");
      issueCount++;
    }

    // 2. Should have a blockquote description after the title
    const hasBlockquote = trimmedLines.some((l) => l.startsWith("> "));
    if (!hasBlockquote) {
      result.issues.push("Missing blockquote description (> A short summary of your site)");
      issueCount++;
    }

    // 3. Should have at least one ## section heading
    const sectionHeadings = trimmedLines.filter((l) => l.match(/^## .+/));
    if (sectionHeadings.length === 0) {
      result.issues.push("No ## section headings found — content should be organized into sections");
      issueCount++;
    }

    // 4. Should contain markdown links
    const hasLinks = text.match(/\[.+?\]\(.+?\)/);
    if (!hasLinks) {
      result.issues.push("No markdown links found — include links to key pages like [About](/about)");
      issueCount++;
    }

    // 5. Should not have multiple H1s
    const h1Count = trimmedLines.filter((l) => l.match(/^# [^#]/)).length;
    if (h1Count > 1) {
      result.issues.push(`Found ${h1Count} top-level headings — only one # heading is allowed`);
      issueCount++;
    }

    // 6. Should not be empty
    const contentLines = trimmedLines.filter((l) => l.trim() !== "");
    if (contentLines.length < 3) {
      result.issues.push("File is too short — add a title, description, and at least one section");
      issueCount++;
    }

    // 7. Check for stray HTML
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

    // Fetch the page
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SEOToolBot/1.0; +https://seo-tool.dev)",
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

    // Extract SEO data
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
    const internalLinks = $(`a[href^="/"], a[href*="${new URL(targetUrl).hostname}"]`).length;
    const externalLinks = allLinks - internalLinks;

    // Open Graph
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogDescription =
      $('meta[property="og:description"]').attr("content") || "";
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

    // llms.txt analysis
    const llmsTxt = await analyzeLlmsTxt(targetUrl);

    // Compute SEO score
    const checks = [
      { name: "Has title", pass: title.length > 0, weight: 10 },
      { name: "Title length (30-60 chars)", pass: title.length >= 30 && title.length <= 60, weight: 5 },
      { name: "Has meta description", pass: metaDescription.length > 0, weight: 10 },
      { name: "Description length (120-160 chars)", pass: metaDescription.length >= 120 && metaDescription.length <= 160, weight: 5 },
      { name: "Has H1", pass: h1s.length > 0, weight: 10 },
      { name: "Single H1", pass: h1s.length === 1, weight: 5 },
      { name: "Has H2 tags", pass: h2Count > 0, weight: 5 },
      { name: "All images have alt text", pass: totalImages === 0 || imagesWithAlt === totalImages, weight: 10 },
      { name: "Has canonical URL", pass: canonical.length > 0, weight: 5 },
      { name: "Has Open Graph title", pass: ogTitle.length > 0, weight: 5 },
      { name: "Has Open Graph description", pass: ogDescription.length > 0, weight: 5 },
      { name: "Has Open Graph image", pass: ogImage.length > 0, weight: 5 },
      { name: "Has viewport meta", pass: hasViewport, weight: 5 },
      { name: "Has lang attribute", pass: lang.length > 0, weight: 5 },
      { name: "Word count > 300", pass: wordCount >= 300, weight: 10 },
      { name: "Has llms.txt", pass: llmsTxt.exists, weight: 5, category: "ai" },
      { name: "llms.txt properly formatted", pass: llmsTxt.valid, weight: 5, category: "ai" },
    ];

    const maxScore = checks.reduce((sum, c) => sum + c.weight, 0);
    const earnedScore = checks.reduce(
      (sum, c) => sum + (c.pass ? c.weight : 0),
      0
    );
    const score = Math.round((earnedScore / maxScore) * 100);

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
      checks,
      score,
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

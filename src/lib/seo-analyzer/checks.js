import { logError } from "@/lib/logger";

/**
 * Build a check object in the canonical shape.
 */
export function check({ name, status, weight, category, value, message }) {
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
// llms.txt analyser
// ---------------------------------------------------------------------------
export async function analyzeLlmsTxt(siteUrl) {
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
  } catch (err) {
    logError("seo-analyzer/analyzeLlmsTxt", err);
    result.issues.push("Could not fetch llms.txt — connection failed or timed out");
  }

  return result;
}

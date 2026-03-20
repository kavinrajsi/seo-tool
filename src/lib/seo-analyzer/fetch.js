import { logError } from "@/lib/logger";

/**
 * Safe fetch wrapper with timeout — never throws, returns null on failure.
 */
export async function safeFetch(url, opts = {}) {
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
  } catch (err) {
    logError("seo-analyzer/safeFetch", err);
    return null;
  }
}

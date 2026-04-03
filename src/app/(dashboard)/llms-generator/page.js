"use client";

import { useState } from "react";
import { logError } from "@/lib/logger";
import {
  BotIcon,
  RefreshCwIcon,
  CopyIcon,
  DownloadIcon,
  CheckIcon,
  GlobeIcon,
} from "lucide-react";

export default function LlmsGenerator() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [llmsTxt, setLlmsTxt] = useState("");
  const [existingLlmsTxt, setExistingLlmsTxt] = useState("");
  const [siteData, setSiteData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [source, setSource] = useState(""); // "existing" or "generated"

  async function handleCrawlAndGenerate(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setLlmsTxt("");
    setExistingLlmsTxt("");
    setSource("");

    try {
      // First, check if llms.txt already exists
      let inputUrl = url.trim();
      if (!inputUrl.startsWith("http")) inputUrl = `https://${inputUrl}`;
      const origin = new URL(inputUrl).origin;

      try {
        const llmsRes = await fetch(`/api/proxy-fetch?url=${encodeURIComponent(`${origin}/llms.txt`)}`);
        if (llmsRes.ok) {
          const text = await llmsRes.text();
          if (text && text.startsWith("#")) {
            setExistingLlmsTxt(text);
            setLlmsTxt(text);
            setSource("existing");
            setLoading(false);
            return;
          }
        }
      } catch {}

      setSource("generated");

      // Analyze the homepage to get title/description
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error);

      // Then crawl for page URLs
      const crawlRes = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const crawlData = await crawlRes.json();
      if (!crawlRes.ok) throw new Error(crawlData.error);

      setSiteData({ analyze: analyzeData, crawl: crawlData });
      setSiteName(analyzeData.title || new URL(analyzeData.url).hostname);
      setSiteDescription(analyzeData.meta_description || "");

      // Auto-generate initial llms.txt
      generateLlmsTxt(analyzeData, crawlData, analyzeData.title || "", analyzeData.meta_description || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function generateLlmsTxt(analyzeData, crawlData, name, description) {
    const siteUrl = analyzeData?.url || url.trim();
    const hostname = new URL(siteUrl).hostname;
    const title = name || hostname;
    const desc = description || `Information about ${hostname}`;

    // Collect page URLs from crawl data
    const pages = new Set();
    pages.add(siteUrl);
    if (crawlData?.error_pages) {
      crawlData.error_pages.forEach((p) => pages.add(p.url));
    }
    if (crawlData?.no_canonical_pages) {
      crawlData.no_canonical_pages.forEach((u) => pages.add(u));
    }
    if (crawlData?.low_link_pages) {
      crawlData.low_link_pages.forEach((p) => pages.add(p.url));
    }

    // Build sections from keywords
    const keywords = analyzeData?.keywords || [];
    const topKeywords = keywords.slice(0, 5).map((k) => k.word).join(", ");

    // Generate llms.txt
    const lines = [
      `# ${title}`,
      "",
      `> ${desc}`,
      "",
      `${title} is a website at ${siteUrl}.${topKeywords ? ` Key topics include: ${topKeywords}.` : ""}`,
      "",
      "## Pages",
      "",
    ];

    const sortedPages = [...pages].filter((p) => {
      try { new URL(p); return true; } catch (err) { logError("llms-generator/validate-url", err); return false; }
    });

    for (const page of sortedPages) {
      const path = new URL(page).pathname;
      const pageName = path === "/" ? "Home" : path.replace(/^\//, "").replace(/[-_]/g, " ").replace(/\//g, " > ");
      lines.push(`- [${pageName}](${page})`);
    }

    if (analyzeData?.structured_data_types?.length > 0) {
      lines.push("");
      lines.push("## Structured Data");
      lines.push("");
      lines.push(`This site uses the following structured data types: ${analyzeData.structured_data_types.join(", ")}.`);
    }

    if (analyzeData?.h1s?.length > 0) {
      lines.push("");
      lines.push("## Main Topics");
      lines.push("");
      analyzeData.h1s.forEach((h1) => {
        lines.push(`- ${h1}`);
      });
    }

    lines.push("");
    lines.push("## Optional");
    lines.push("");
    lines.push(`- [Full llms.txt](${new URL(siteUrl).origin}/llms-full.txt): Extended version with detailed content`);

    setLlmsTxt(lines.join("\n"));
  }

  function handleRegenerate() {
    if (siteData) {
      generateLlmsTxt(siteData.analyze, siteData.crawl, siteName, siteDescription);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(llmsTxt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([llmsTxt], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "llms.txt";
    link.click();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">LLMs.txt Generator</h1>
        <p className="text-muted-foreground mt-1">
          Auto-generate llms.txt files so AI systems can properly index and cite your site.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form onSubmit={handleCrawlAndGenerate} className="flex gap-2">
        <input
          type="text"
          placeholder="Enter site URL (e.g. example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : <BotIcon className="h-4 w-4" />}
          {loading ? "Analyzing..." : "Generate"}
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCwIcon className="h-5 w-5 animate-spin mr-2" />
          Crawling site and generating llms.txt... This may take a minute.
        </div>
      )}

      {llmsTxt && (
        <>
          {/* Source indicator */}
          {source === "existing" && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center justify-between">
              <span>This site already has an llms.txt file.</span>
              <button
                onClick={() => { setSource("generated"); setLlmsTxt(""); setExistingLlmsTxt(""); handleCrawlAndGenerate({ preventDefault: () => {} }); }}
                className="text-xs border border-green-500/30 px-3 py-1 rounded-md hover:bg-green-500/10"
              >
                Generate new instead
              </button>
            </div>
          )}

          {/* Customize fields (only for generated) */}
          {source === "generated" && <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-3">Customize</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Site Name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Site Description</label>
                <input
                  type="text"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
              </div>
            </div>
            <button
              onClick={handleRegenerate}
              className="mt-3 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2"
            >
              <RefreshCwIcon className="h-4 w-4" />
              Regenerate
            </button>
          </div>}

          {/* Output */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Generated llms.txt</h3>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent flex items-center gap-1.5">
                  {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-400" /> : <CopyIcon className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button onClick={handleDownload} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent flex items-center gap-1.5">
                  <DownloadIcon className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>
            <textarea
              value={llmsTxt}
              onChange={(e) => setLlmsTxt(e.target.value)}
              rows={20}
              className="w-full rounded-md bg-background border border-border p-4 text-sm font-mono overflow-x-auto whitespace-pre text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/60 resize-y"
            />
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <GlobeIcon className="h-4 w-4 text-muted-foreground" />
              How to Deploy
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Download or copy the generated llms.txt content above</li>
              <li>Place the file at your site root: <code className="px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">yoursite.com/llms.txt</code></li>
              <li>For Next.js: put it in the <code className="px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">public/</code> directory</li>
              <li>Verify by visiting <code className="px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">yoursite.com/llms.txt</code> in your browser</li>
              <li>AI chatbots and search engines will use this to understand and cite your site</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

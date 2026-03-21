"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import { logError } from "@/lib/logger";
import QRCode from "qrcode";
import {
  FileTextIcon,
  RefreshCwIcon,
  CopyIcon,
  DownloadIcon,
  CheckIcon,
  GlobeIcon,
  QrCodeIcon,
} from "lucide-react";

const CHANGEFREQ_OPTIONS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

export default function SitemapGenerator() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [error, setError] = useState("");
  const [urls, setUrls] = useState([]); // { url, selected, priority, changefreq, lastmod }
  const [xml, setXml] = useState("");
  const [copied, setCopied] = useState(false);
  const [recentCrawls, setRecentCrawls] = useState([]);
  const [savedSitemaps, setSavedSitemaps] = useState([]);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    loadRecentCrawls();
    loadSavedSitemaps();
  }, [activeTeam, activeProject]);

  // Auto-fill URL from active project domain
  useEffect(() => {
    if (activeProject?.domain) {
      const domain = activeProject.domain.replace(/^https?:\/\//, "");
      setUrl(domain);
    }
  }, [activeProject]);

  async function loadRecentCrawls() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("crawl_reports")
      .select("id, url, data, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", user.id).is("team_id", null);
    }

    const { data } = await query;
    if (data) setRecentCrawls(data);
  }

  async function loadSavedSitemaps() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("sitemap_reports")
      .select("id, url, data, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", user.id).is("team_id", null);
    }

    const { data } = await query;
    if (data) setSavedSitemaps(data);
  }

  async function saveSitemap(sitemapXml, selectedUrls) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("sitemap_reports").insert({
      user_id: user.id,
      team_id: activeTeam?.id || null,
      url: url.trim() || selectedUrls[0]?.url || "unknown",
      data: { xml: sitemapXml, urls: selectedUrls, url_count: selectedUrls.length },
    });

    loadSavedSitemaps();
  }

  function loadFromSaved(saved) {
    if (saved.data?.xml) {
      setXml(saved.data.xml);
    }
    if (saved.data?.urls) {
      setUrls(saved.data.urls);
    }
  }

  function loadFromCrawl(crawlData) {
    const crawledUrls = [];
    // Extract URLs from crawl data — the crawl route returns status_codes info
    // We need to reconstruct from the raw data
    // The crawl stores aggregate data, not individual URLs. But error_pages and low_link_pages have URLs.
    // Let's try extracting from the sitemap data or use the error_pages + no_canonical_pages
    if (crawlData.error_pages) {
      for (const p of crawlData.error_pages) {
        crawledUrls.push(p.url);
      }
    }
    if (crawlData.no_canonical_pages) {
      for (const u of crawlData.no_canonical_pages) {
        if (!crawledUrls.includes(u)) crawledUrls.push(u);
      }
    }
    if (crawlData.low_link_pages) {
      for (const p of crawlData.low_link_pages) {
        if (!crawledUrls.includes(p.url)) crawledUrls.push(p.url);
      }
    }

    // If the crawl has limited URL data, prompt user to crawl fresh
    if (crawledUrls.length === 0) {
      setError("This crawl report doesn't have individual URL data. Try crawling the site fresh.");
      return;
    }

    setUrls(
      crawledUrls.map((u) => ({
        url: u,
        selected: true,
        priority: "0.5",
        changefreq: "weekly",
        lastmod: new Date().toISOString().split("T")[0],
      }))
    );
    setXml("");
  }

  async function handleCrawl(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setCrawlLoading(true);
    setError("");

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Extract all crawled page URLs from the response
      // The crawl response includes status info but we need to reconstruct URLs
      // Use error_pages, no_canonical_pages, low_link_pages
      const allUrls = new Set();

      let startUrl = url.trim();
      if (!startUrl.startsWith("http")) startUrl = "https://" + startUrl;
      allUrls.add(startUrl);

      if (data.error_pages) data.error_pages.forEach((p) => allUrls.add(p.url));
      if (data.no_canonical_pages) data.no_canonical_pages.forEach((u) => allUrls.add(u));
      if (data.low_link_pages) data.low_link_pages.forEach((p) => allUrls.add(p.url));

      // If we got very few URLs, add the base URL with common paths
      const urlList = [...allUrls].filter((u) => {
        try { new URL(u); return true; } catch (err) { logError("sitemap-generator/validate-url", err); return false; }
      });

      setUrls(
        urlList.map((u) => ({
          url: u,
          selected: true,
          priority: u === startUrl ? "1.0" : "0.5",
          changefreq: "weekly",
          lastmod: new Date().toISOString().split("T")[0],
        }))
      );
      setXml("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCrawlLoading(false);
    }
  }

  function generateXml() {
    const selected = urls.filter((u) => u.selected);
    if (selected.length === 0) {
      setError("Select at least one URL");
      return;
    }

    const entries = selected
      .map(
        (u) => `  <url>
    <loc>${escapeXml(u.url)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join("\n");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

    setXml(sitemap);
    saveSitemap(sitemap, selected);
    generateQrCode();
  }

  function escapeXml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function handleCopy() {
    navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function generateQrCode() {
    let siteUrl = url.trim();
    if (!siteUrl.startsWith("http")) siteUrl = "https://" + siteUrl;
    try {
      const dataUrl = await QRCode.toDataURL(siteUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      logError("sitemap-generator/generate-qr", err);
      setError("Failed to generate QR code.");
    }
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "sitemap-qr.png";
    link.click();
  }

  function handleDownload() {
    const blob = new Blob([xml], { type: "application/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sitemap.xml";
    link.click();
  }

  function toggleAll(checked) {
    setUrls((prev) => prev.map((u) => ({ ...u, selected: checked })));
  }

  function updateUrl(idx, field, value) {
    setUrls((prev) => prev.map((u, i) => (i === idx ? { ...u, [field]: value } : u)));
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sitemap Generator</h1>
        <p className="text-muted-foreground mt-1">Generate XML sitemaps from crawl data or a fresh crawl.</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Crawl input */}
      <form onSubmit={handleCrawl} className="flex gap-2">
        <input
          type="text"
          placeholder="Enter site URL to crawl (e.g. example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={crawlLoading}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {crawlLoading ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : <GlobeIcon className="h-4 w-4" />}
          {crawlLoading ? "Crawling..." : "Crawl & Generate"}
        </button>
      </form>

      {/* Recent crawls */}
      {recentCrawls.length > 0 && urls.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-3">Use Recent Crawl Data</h3>
          <div className="space-y-2">
            {recentCrawls.map((c) => (
              <button
                key={c.id}
                onClick={() => loadFromCrawl(c.data)}
                className="flex w-full items-center justify-between rounded-md border border-border/50 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
              >
                <span className="text-sm">{c.url}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved sitemaps */}
      {savedSitemaps.length > 0 && urls.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-3">Saved Sitemaps</h3>
          <div className="space-y-2">
            {savedSitemaps.map((s) => (
              <button
                key={s.id}
                onClick={() => loadFromSaved(s)}
                className="flex w-full items-center justify-between rounded-md border border-border/50 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{s.url}</span>
                  <span className="text-xs text-muted-foreground">({s.data?.url_count || 0} URLs)</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* URL list with checkboxes */}
      {urls.length > 0 && (
        <>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">URLs ({urls.filter((u) => u.selected).length} selected)</h3>
              <div className="flex gap-2">
                <button onClick={() => toggleAll(true)} className="text-xs text-primary hover:underline">Select All</button>
                <button onClick={() => toggleAll(false)} className="text-xs text-muted-foreground hover:underline">Deselect All</button>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {urls.map((u, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={u.selected}
                    onChange={(e) => updateUrl(i, "selected", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{u.url}</span>
                  <select value={u.priority} onChange={(e) => updateUrl(i, "priority", e.target.value)} className="rounded border border-border bg-background px-2 py-1 text-xs">
                    {["1.0", "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3", "0.2", "0.1"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select value={u.changefreq} onChange={(e) => updateUrl(i, "changefreq", e.target.value)} className="rounded border border-border bg-background px-2 py-1 text-xs">
                    {CHANGEFREQ_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={u.lastmod}
                    onChange={(e) => updateUrl(i, "lastmod", e.target.value)}
                    className="rounded border border-border bg-background px-2 py-1 text-xs"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={generateXml}
              className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
            >
              <FileTextIcon className="h-4 w-4" />
              Generate Sitemap XML
            </button>
          </div>

          {/* Generated XML */}
          {xml && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Generated sitemap.xml</h3>
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
              <pre className="rounded-md bg-background border border-border p-4 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre text-muted-foreground">
                {xml}
              </pre>
            </div>
          )}

          {/* QR Code */}
          {xml && qrDataUrl && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <QrCodeIcon className="h-4 w-4" />
                  QR Code
                </h3>
                <button onClick={handleDownloadQr} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent flex items-center gap-1.5">
                  <DownloadIcon className="h-3.5 w-3.5" />
                  Download QR
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg bg-white p-3">
                  <img src={qrDataUrl} alt="Sitemap QR Code" width={200} height={200} />
                </div>
                <p className="text-xs text-muted-foreground">Scan to visit the site</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

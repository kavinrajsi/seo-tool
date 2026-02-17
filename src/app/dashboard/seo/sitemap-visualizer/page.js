"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import SitemapTree from "@/app/components/SitemapTree";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

// ── Platform detection & content type classification ──

function detectPlatform(urls, sitemapNames) {
  const names = (sitemapNames || []).map((n) => n.toLowerCase());
  const allLocs = urls.map((u) => u.loc.toLowerCase());
  const allSources = urls.map((u) => (u.source || "").toLowerCase());

  // WordPress signals: Yoast-style sitemap names or WP URL patterns
  const wpSitemapPatterns = ["post-sitemap", "page-sitemap", "category-sitemap", "tag-sitemap", "author-sitemap"];
  const hasWpSitemaps = names.some((n) => wpSitemapPatterns.some((p) => n.includes(p)));
  const hasWpSources = allSources.some((s) => wpSitemapPatterns.some((p) => s.includes(p)));
  const hasWpUrls = allLocs.some(
    (l) => l.includes("/wp-content/") || l.includes("/wp-json/") || l.includes("/category/") || l.includes("/tag/")
  );

  if (hasWpSitemaps || hasWpSources || hasWpUrls) return "wordpress";

  // Shopify signals: /products/, /collections/, myshopify.com
  const hasShopifyUrls = allLocs.some(
    (l) => l.includes("/products/") || l.includes("/collections/")
  );
  const hasShopifyDomain = allLocs.some((l) => l.includes("myshopify.com"));

  if (hasShopifyUrls || hasShopifyDomain) return "shopify";

  return null;
}

function classifyUrl(url, platform) {
  const loc = url.loc.toLowerCase();
  const source = (url.source || "").toLowerCase();

  if (platform === "wordpress") {
    // Category
    if (loc.includes("/category/") || source.includes("category-sitemap")) return "category";
    // Tag
    if (loc.includes("/tag/") || source.includes("tag-sitemap")) return "tag";
    // Post (from post-sitemap or date-patterned URLs like /2024/01/slug/)
    if (source.includes("post-sitemap")) return "post";
    const datePattern = /\/\d{4}\/\d{2}\//;
    if (datePattern.test(loc)) return "post";
    // Page (from page-sitemap or explicit /page/ paths)
    if (source.includes("page-sitemap")) return "page";
    // Author
    if (loc.includes("/author/") || source.includes("author-sitemap")) return "other";
    // Fallback: top-level paths are likely pages
    try {
      const path = new URL(url.loc).pathname;
      const segments = path.split("/").filter(Boolean);
      if (segments.length <= 1) return "page";
    } catch {
      // skip
    }
    return "other";
  }

  if (platform === "shopify") {
    if (loc.includes("/products/")) return "product";
    if (loc.includes("/collections/")) return "collection";
    if (loc.includes("/pages/")) return "page";
    return "other";
  }

  return "other";
}

function getContentBreakdown(urls, sitemapNames) {
  const platform = detectPlatform(urls, sitemapNames);
  if (!platform) return null;

  const counts = {};
  for (const u of urls) {
    const type = classifyUrl(u, platform);
    counts[type] = (counts[type] || 0) + 1;
  }

  let categories;
  if (platform === "wordpress") {
    categories = [
      { key: "page", label: "Pages", color: "#3b82f6" },
      { key: "post", label: "Posts", color: "#8b5cf6" },
      { key: "category", label: "Categories", color: "#f59e0b" },
      { key: "tag", label: "Tags", color: "#06b6d4" },
      { key: "other", label: "Other", color: "#6b7280" },
    ];
  } else {
    categories = [
      { key: "page", label: "Pages", color: "#3b82f6" },
      { key: "collection", label: "Collections", color: "#f59e0b" },
      { key: "product", label: "Products", color: "#8b5cf6" },
      { key: "other", label: "Other", color: "#6b7280" },
    ];
  }

  return {
    platform,
    categories: categories.filter((c) => (counts[c.key] || 0) > 0).map((c) => ({
      ...c,
      count: counts[c.key] || 0,
    })),
    total: urls.length,
  };
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function exportCSV(urls) {
  const rows = [["URL", "Last Modified", "Change Frequency", "Priority"]];
  for (const u of urls) {
    rows.push([u.loc, u.lastmod || "", u.changefreq || "", u.priority || ""]);
  }
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sitemap-urls.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function SitemapVisualizerPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  // Input state
  const [inputTab, setInputTab] = useState("url"); // "url" | "upload"
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  // Parse state
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [urls, setUrls] = useState([]);
  const [sitemapCount, setSitemapCount] = useState(0);
  const [sitemapNames, setSitemapNames] = useState([]);
  const [sourceType, setSourceType] = useState("url");
  const [sourceUrl, setSourceUrl] = useState("");

  // View state
  const [viewMode, setViewMode] = useState("tree"); // "tree" | "table"

  // Save state
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  // Past sitemaps
  const [pastItems, setPastItems] = useState([]);
  const [pastLoading, setPastLoading] = useState(true);

  // Viewing saved
  const [viewingSaved, setViewingSaved] = useState(false);
  const [savedName, setSavedName] = useState("");

  const uniqueDomains = useMemo(() => {
    const domains = new Set();
    for (const u of urls) {
      try {
        domains.add(new URL(u.loc).hostname);
      } catch {
        // skip
      }
    }
    return domains.size;
  }, [urls]);

  const contentBreakdown = useMemo(() => {
    if (urls.length === 0) return null;
    return getContentBreakdown(urls, sitemapNames);
  }, [urls, sitemapNames]);

  const fetchPastItems = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      const res = await projectFetch(`/api/sitemap-visualizer?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPastItems(json.items || []);
      }
    } catch {
      // Silent fail
    } finally {
      setPastLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    fetchPastItems();
  }, [fetchPastItems]);

  const handleParse = useCallback(async () => {
    setError("");
    setParsing(true);
    setSavedId(null);

    try {
      let body;
      if (inputTab === "url") {
        if (!urlInput.trim()) {
          setError("Please enter a sitemap URL");
          setParsing(false);
          return;
        }
        body = { url: urlInput.trim() };
        setSourceType("url");
        setSourceUrl(urlInput.trim());
      } else {
        if (!file) {
          setError("Please select a sitemap XML file");
          setParsing(false);
          return;
        }
        const xml = await file.text();
        body = { xml };
        setSourceType("upload");
        setSourceUrl(file.name);
      }

      const res = await fetch("/api/sitemap-visualizer/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse sitemap");
        setParsing(false);
        return;
      }

      setUrls(data.urls);
      setSitemapCount(data.sitemapCount);
      setSitemapNames(data.sitemapNames || []);
      setSaveName("");
      setViewingSaved(false);
    } catch (err) {
      setError(err.message || "Failed to parse sitemap");
    } finally {
      setParsing(false);
    }
  }, [inputTab, urlInput, file]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim() || urls.length === 0) return;
    setSaving(true);

    try {
      const res = await fetch("/api/sitemap-visualizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          sourceType,
          sourceUrl,
          totalUrls: urls.length,
          sitemapCount,
          urls,
          project_id: activeProjectId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSavedId(data.id);
        fetchPastItems();
      }
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  }, [saveName, urls, sourceType, sourceUrl, sitemapCount, fetchPastItems, activeProjectId]);

  const handleViewSaved = useCallback(async (id) => {
    try {
      const res = await projectFetch(`/api/sitemap-visualizer/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setUrls(data.urls_json || []);
      setSitemapCount(data.sitemap_count || 0);
      setSourceType(data.source_type);
      setSourceUrl(data.source_url || "");
      setSavedId(data.id);
      setSavedName(data.name);
      setSaveName(data.name);
      setViewingSaved(true);
    } catch {
      // Silent fail
    }
  }, [activeProjectId]);

  const handleDeleteSaved = useCallback(async (id) => {
    if (!confirm("Delete this sitemap visualization?")) return;
    try {
      const res = await fetch(`/api/sitemap-visualizer/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPastItems((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // Silent fail
    }
  }, []);

  const handleReset = useCallback(() => {
    setUrls([]);
    setSitemapCount(0);
    setSitemapNames([]);
    setError("");
    setSavedId(null);
    setSaveName("");
    setViewingSaved(false);
    setSavedName("");
  }, []);

  const handleFileChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }, []);

  const handleDropAreaClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hasParsedData = urls.length > 0;

  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>
          {viewingSaved ? savedName : "Sitemap Visualizer"}
        </h1>
        {hasParsedData && (
          <button className={styles.resetBtn} onClick={handleReset} type="button">
            {viewingSaved ? "Back to Input" : "Start Over"}
          </button>
        )}
      </div>

      {/* Input section */}
      {!hasParsedData && (
        <>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${inputTab === "url" ? styles.tabActive : ""}`}
              onClick={() => setInputTab("url")}
            >
              Enter URL
            </button>
            <button
              type="button"
              className={`${styles.tab} ${inputTab === "upload" ? styles.tabActive : ""}`}
              onClick={() => setInputTab("upload")}
            >
              Upload XML
            </button>
          </div>

          <div className={styles.inputSection}>
            {inputTab === "url" ? (
              <div className={styles.inputGroup}>
                <div className={styles.inputField}>
                  <label htmlFor="sitemap-url">Sitemap URL</label>
                  <input
                    id="sitemap-url"
                    type="text"
                    placeholder="https://example.com/sitemap.xml"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !parsing) handleParse();
                    }}
                  />
                </div>
                <button
                  className={styles.parseBtn}
                  onClick={handleParse}
                  disabled={parsing}
                  type="button"
                >
                  {parsing ? <span className={styles.spinner} /> : "Parse Sitemap"}
                </button>
              </div>
            ) : (
              <>
                <div className={styles.uploadArea} onClick={handleDropAreaClick}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <div className={styles.uploadIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className={styles.uploadText}>Click to select a sitemap XML file</div>
                  <div className={styles.uploadHint}>Supports .xml sitemap files</div>
                </div>
                {file && (
                  <div className={styles.fileName}>
                    <span className={styles.fileNameText}>{file.name}</span>
                    <button
                      type="button"
                      className={styles.clearFile}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                {file && (
                  <div style={{ textAlign: "center" }}>
                    <button
                      className={`${styles.parseBtn} ${styles.uploadParseBtn}`}
                      onClick={handleParse}
                      disabled={parsing}
                      type="button"
                    >
                      {parsing ? <span className={styles.spinner} /> : "Parse Sitemap"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {/* Results */}
      {hasParsedData && (
        <>
          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{urls.length}</div>
              <div className={styles.statLabel}>Total URLs</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{sitemapCount}</div>
              <div className={styles.statLabel}>Sitemaps</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{uniqueDomains}</div>
              <div className={styles.statLabel}>Unique Domains</div>
            </div>
          </div>

          {/* Content type breakdown */}
          {contentBreakdown && (
            <div className={styles.breakdownSection}>
              <div className={styles.breakdownHeader}>
                <span className={styles.breakdownPlatform}>
                  {contentBreakdown.platform === "wordpress" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  )}
                  {contentBreakdown.platform === "wordpress" ? "WordPress" : "Shopify"} Site
                </span>
                <span className={styles.breakdownSubtitle}>Content Type Breakdown</span>
              </div>

              {/* Bar chart */}
              <div className={styles.breakdownBar}>
                {contentBreakdown.categories.map((cat) => (
                  <div
                    key={cat.key}
                    className={styles.breakdownBarSegment}
                    style={{
                      width: `${(cat.count / contentBreakdown.total) * 100}%`,
                      backgroundColor: cat.color,
                    }}
                    title={`${cat.label}: ${cat.count}`}
                  />
                ))}
              </div>

              {/* Legend chips */}
              <div className={styles.breakdownLegend}>
                {contentBreakdown.categories.map((cat) => (
                  <div key={cat.key} className={styles.breakdownChip}>
                    <span
                      className={styles.breakdownDot}
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className={styles.breakdownChipLabel}>{cat.label}</span>
                    <span className={styles.breakdownChipCount}>{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === "tree" ? styles.viewBtnActive : ""}`}
                onClick={() => setViewMode("tree")}
              >
                Tree
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === "table" ? styles.viewBtnActive : ""}`}
                onClick={() => setViewMode("table")}
              >
                Table
              </button>
            </div>

            <button
              className={styles.exportBtn}
              onClick={() => exportCSV(urls)}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>

            <div className={styles.saveSection}>
              {savedId ? (
                <span className={styles.savedBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Saved
                </span>
              ) : (
                <>
                  <input
                    className={styles.saveInput}
                    type="text"
                    placeholder="Name this sitemap..."
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving || !saveName.trim()}
                    type="button"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tree view */}
          {viewMode === "tree" && <SitemapTree urls={urls} />}

          {/* Table view */}
          {viewMode === "table" && (
            <>
              <table className={styles.urlTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>URL</th>
                    <th>Last Modified</th>
                    <th>Frequency</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {urls.map((u, i) => (
                    <tr key={u.loc}>
                      <td>{i + 1}</td>
                      <td className={styles.urlCell}>
                        <a href={u.loc} target="_blank" rel="noopener noreferrer">{u.loc}</a>
                      </td>
                      <td>{u.lastmod ? <span className={styles.metaBadge}>{u.lastmod}</span> : <span className={styles.naText}>--</span>}</td>
                      <td>{u.changefreq ? <span className={styles.metaBadge}>{u.changefreq}</span> : <span className={styles.naText}>--</span>}</td>
                      <td>{u.priority ? <span className={styles.metaBadge}>{u.priority}</span> : <span className={styles.naText}>--</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className={styles.mobileCards}>
                {urls.map((u) => (
                  <div key={u.loc} className={styles.mobileCard}>
                    <div className={styles.mobileCardUrl}>{u.loc}</div>
                    <div className={styles.mobileCardMeta}>
                      {u.lastmod && <span className={styles.metaBadge}>{u.lastmod}</span>}
                      {u.changefreq && <span className={styles.metaBadge}>{u.changefreq}</span>}
                      {u.priority && <span className={styles.metaBadge}>P: {u.priority}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Past sitemaps */}
      {!viewingSaved && (
        <div className={styles.pastSection}>
          <h2 className={styles.pastHeading}>Saved Sitemaps</h2>

          {pastLoading ? (
            <div className={styles.pastEmpty}>Loading saved sitemaps...</div>
          ) : pastItems.length === 0 ? (
            <div className={styles.pastEmpty}>
              No saved sitemaps yet. Parse a sitemap and save it to see it here.
            </div>
          ) : (
            <>
              <table className={styles.pastTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Source</th>
                    <th>URLs</th>
                    <th>Sitemaps</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>
                        <span className={styles.metaBadge}>
                          {item.source_type === "upload" ? "Upload" : "URL"}
                        </span>
                      </td>
                      <td>{item.total_urls}</td>
                      <td>{item.sitemap_count}</td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        <div className={styles.pastActions}>
                          <button
                            className={styles.pastViewBtn}
                            onClick={() => handleViewSaved(item.id)}
                            type="button"
                            title="View"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            className={styles.pastDeleteBtn}
                            onClick={() => handleDeleteSaved(item.id)}
                            type="button"
                            title="Delete"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile past cards */}
              <div className={styles.pastMobile}>
                {pastItems.map((item) => (
                  <div key={item.id} className={styles.pastMobileCard}>
                    <div className={styles.pastMobileCardName}>{item.name}</div>
                    <div className={styles.pastMobileCardStats}>
                      <span>{item.total_urls} URLs</span>
                      <span>{item.sitemap_count} sitemaps</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <div className={styles.pastMobileCardActions}>
                      <button
                        className={styles.pastViewBtn}
                        onClick={() => handleViewSaved(item.id)}
                        type="button"
                        title="View"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        className={styles.pastDeleteBtn}
                        onClick={() => handleDeleteSaved(item.id)}
                        type="button"
                        title="Delete"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

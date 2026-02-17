"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getShortUrl(code) {
  if (typeof window === "undefined") return `/s/${code}`;
  return `${window.location.origin}/s/${code}`;
}

export default function UrlShortenerPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  // Form state
  const [originalUrl, setOriginalUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Just-created link
  const [justCreated, setJustCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  // List state
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const stats = useMemo(() => {
    const total = urls.length;
    const totalClicks = urls.reduce((sum, u) => sum + (u.clicks || 0), 0);
    const active = urls.filter((u) => (u.clicks || 0) > 0).length;
    return { total, totalClicks, active };
  }, [urls]);

  const fetchUrls = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (search) params.set("search", search);
      const res = await projectFetch(`/api/short-urls?${params}`);
      if (res.ok) {
        const json = await res.json();
        setUrls(json.urls || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [search, projectFetch]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const handleCreate = useCallback(async () => {
    if (!originalUrl.trim()) return;
    setError("");
    setCreating(true);
    setJustCreated(null);
    setCopied(false);

    try {
      const res = await fetch("/api/short-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: originalUrl.trim(),
          customCode: customCode.trim() || undefined,
          title: title.trim() || undefined,
          project_id: activeProjectId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create short URL");
        setCreating(false);
        return;
      }

      setJustCreated(data);
      setUrls((prev) => [data, ...prev]);
      setOriginalUrl("");
      setCustomCode("");
      setTitle("");
    } catch (err) {
      setError(err.message || "Failed to create short URL");
    } finally {
      setCreating(false);
    }
  }, [originalUrl, customCode, title, activeProjectId]);

  const handleCopyShort = useCallback((code, id) => {
    const shortUrl = getShortUrl(code);
    navigator.clipboard.writeText(shortUrl).then(() => {
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!confirm("Delete this short URL?")) return;
    try {
      const res = await fetch(`/api/short-urls/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUrls((prev) => prev.filter((u) => u.id !== id));
      }
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>URL Shortener</h1>
      </div>

      {/* Create form */}
      <div className={styles.createCard}>
        <div className={styles.formRow}>
          <div className={styles.inputField}>
            <label htmlFor="original-url">Destination URL</label>
            <input
              id="original-url"
              type="text"
              placeholder="https://example.com/very-long-url-to-shorten"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) handleCreate();
              }}
            />
          </div>
          <button
            className={styles.createBtn}
            onClick={handleCreate}
            disabled={creating || !originalUrl.trim()}
            type="button"
          >
            {creating ? <span className={styles.spinner} /> : "Shorten"}
          </button>
        </div>
        <div className={styles.formRow}>
          <div className={styles.inputFieldSmall}>
            <label htmlFor="custom-code">
              Custom Code <span className={styles.optionalLabel}>(optional)</span>
            </label>
            <input
              id="custom-code"
              type="text"
              placeholder="my-link"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
            />
          </div>
          <div className={styles.inputField}>
            <label htmlFor="link-title">
              Title <span className={styles.optionalLabel}>(optional)</span>
            </label>
            <input
              id="link-title"
              type="text"
              placeholder="Campaign landing page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Just created success card */}
      {justCreated && (
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className={styles.successBody}>
            <div className={styles.successLabel}>Short URL Created</div>
            <div className={styles.shortUrlText}>{getShortUrl(justCreated.code)}</div>
          </div>
          <button
            className={`${styles.copyBtn} ${copied ? styles.copiedBtn : ""}`}
            onClick={() => handleCopyShort(justCreated.code)}
            type="button"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      {/* Stats */}
      {urls.length > 0 && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Links</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalClicks}</div>
            <div className={styles.statLabel}>Total Clicks</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.active}</div>
            <div className={styles.statLabel}>Links with Clicks</div>
          </div>
        </div>
      )}

      {/* Search */}
      {urls.length > 5 && (
        <div className={styles.searchBar}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by URL, title, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Loading */}
      {loading && <div className={styles.loadingState}>Loading links...</div>}

      {/* Empty */}
      {!loading && urls.length === 0 && !search && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className={styles.emptyTitle}>No shortened links yet</div>
          <div className={styles.emptyText}>Paste a long URL above to create your first short link.</div>
        </div>
      )}

      {/* Desktop table */}
      {!loading && urls.length > 0 && (
        <>
          <table className={styles.urlsTable}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Short URL</th>
                <th>Original URL</th>
                <th>Clicks</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((item) => (
                <tr key={item.id}>
                  <td className={styles.titleCell}>{item.title || "--"}</td>
                  <td
                    className={styles.shortCell}
                    onClick={() => handleCopyShort(item.code, item.id)}
                    title="Click to copy"
                  >
                    {copiedId === item.id ? "Copied!" : `/s/${item.code}`}
                  </td>
                  <td className={styles.originalCell}>
                    <a href={item.original_url} target="_blank" rel="noopener noreferrer">
                      {item.original_url}
                    </a>
                  </td>
                  <td className={styles.clicksCell}>{item.clicks || 0}</td>
                  <td><span className={styles.dateText}>{formatDate(item.created_at)}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionBtn} ${styles.copyAction}`}
                        onClick={() => handleCopyShort(item.code, item.id)}
                        type="button"
                        title="Copy short URL"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteAction}`}
                        onClick={() => handleDelete(item.id)}
                        type="button"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          {/* Mobile cards */}
          <div className={styles.mobileCards}>
            {urls.map((item) => (
              <div key={item.id} className={styles.mobileCard}>
                {item.title && <div className={styles.mobileCardTitle}>{item.title}</div>}
                <div
                  className={styles.mobileCardShort}
                  onClick={() => handleCopyShort(item.code, item.id)}
                >
                  {copiedId === item.id ? "Copied!" : getShortUrl(item.code)}
                </div>
                <div className={styles.mobileCardOriginal}>{item.original_url}</div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardClicks}>{item.clicks || 0} clicks</span>
                  <div className={styles.mobileCardActions}>
                    <button
                      className={`${styles.actionBtn} ${styles.copyAction}`}
                      onClick={() => handleCopyShort(item.code, item.id)}
                      type="button"
                      title="Copy"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteAction}`}
                      onClick={() => handleDelete(item.id)}
                      type="button"
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

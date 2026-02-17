"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./ReportsList.module.css";

export default function ReportsList() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const limit = 20;

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);

    const res = await fetch(`/api/reports?${params}`);
    if (res.ok) {
      const json = await res.json();
      setReports(json.reports || []);
      setTotal(json.total || 0);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm("Delete this report?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    fetchReports();
  }

  async function handleShare(e, id) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function scoreColorClass(score) {
    if (score >= 70) return styles.scoreGood;
    if (score >= 40) return styles.scoreAverage;
    return styles.scorePoor;
  }

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div className={styles.searchRow}><div style={{ ...s, width: "100%", height: "38px", borderRadius: "8px" }} /></div>
        <table className={styles.table}>
          <thead>
            <tr>
              {["URL","Score","Results","Date","Actions"].map(h => <th key={h} className={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5,6].map(i => (
              <tr key={i}>
                <td className={styles.td}><div style={b("80%", "14px")} /></td>
                <td className={styles.td}><div style={b("40px", "14px")} /></td>
                <td className={styles.td}><div style={b("60px", "14px")} /></td>
                <td className={styles.td}><div style={b("80px", "14px")} /></td>
                <td className={styles.td}><div style={{ display: "flex", gap: "0.5rem" }}><div style={b("28px", "28px")} /><div style={b("28px", "28px")} /><div style={b("28px", "28px")} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (!loading && reports.length === 0 && !search) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No reports yet</p>
        <p className={styles.emptyText}>
          Run your first SEO analysis to see results here.
        </p>
        <Link href="/" className={styles.emptyBtn}>
          Analyze a URL
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search by URL..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Desktop table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>URL</th>
            <th className={styles.th}>Score</th>
            <th className={styles.th}>Results</th>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr
              key={r.id}
              className={styles.row}
              onClick={() => router.push(`/dashboard/reports/${r.id}`)}
            >
              <td className={`${styles.td} ${styles.urlCell}`}>{r.url}</td>
              <td className={`${styles.td} ${styles.scoreCell} ${scoreColorClass(r.overall_score)}`}>
                {r.overall_score}
              </td>
              <td className={styles.td}>
                <div className={styles.severityCounts}>
                  {r.fail_count > 0 && (
                    <span className={`${styles.countBadge} ${styles.countFail}`}>
                      {r.fail_count}
                    </span>
                  )}
                  {r.warning_count > 0 && (
                    <span className={`${styles.countBadge} ${styles.countWarning}`}>
                      {r.warning_count}
                    </span>
                  )}
                  {r.pass_count > 0 && (
                    <span className={`${styles.countBadge} ${styles.countPass}`}>
                      {r.pass_count}
                    </span>
                  )}
                </div>
              </td>
              <td className={`${styles.td} ${styles.dateCell}`}>
                {formatDate(r.created_at)}
              </td>
              <td className={styles.td}>
                <div className={styles.actionBtns}>
                  <button
                    className={styles.viewBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/reports/${r.id}`);
                    }}
                    type="button"
                    title="View report"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button
                    className={styles.shareBtn}
                    onClick={(e) => handleShare(e, r.id)}
                    type="button"
                    title={copiedId === r.id ? "Link copied!" : "Share report"}
                  >
                    {copiedId === r.id ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                    )}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDelete(e, r.id)}
                    type="button"
                    title="Delete report"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        {reports.map((r) => (
          <div
            key={r.id}
            className={styles.mobileCard}
            onClick={() => router.push(`/dashboard/reports/${r.id}`)}
          >
            <div className={styles.mobileCardTop}>
              <span className={styles.mobileCardUrl}>{r.url}</span>
              <span className={styles.mobileCardDate}>{formatDate(r.created_at)}</span>
            </div>
            <div className={styles.mobileCardBottom}>
              <span className={`${styles.scoreCell} ${scoreColorClass(r.overall_score)}`}>
                {r.overall_score}
              </span>
              <div className={styles.severityCounts}>
                {r.fail_count > 0 && (
                  <span className={`${styles.countBadge} ${styles.countFail}`}>{r.fail_count}</span>
                )}
                {r.warning_count > 0 && (
                  <span className={`${styles.countBadge} ${styles.countWarning}`}>{r.warning_count}</span>
                )}
                {r.pass_count > 0 && (
                  <span className={`${styles.countBadge} ${styles.countPass}`}>{r.pass_count}</span>
                )}
              </div>
              <button
                className={styles.shareBtn}
                onClick={(e) => handleShare(e, r.id)}
                type="button"
                title={copiedId === r.id ? "Link copied!" : "Share report"}
              >
                {copiedId === r.id ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                )}
              </button>
              <button
                className={styles.viewBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/reports/${r.id}`);
                }}
                type="button"
                title="View report"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            type="button"
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import styles from "./page.module.css";

export default function TrashPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      const t = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(t);
    }

    async function load() {
      const res = await fetch("/api/admin/trash");
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      } else if (res.status === 403) {
        setError("Access denied.");
      } else {
        setError("Failed to load trash.");
      }
      setLoading(false);
    }
    load();
  }, [authLoading, isAdmin]);

  async function handleRestore(id) {
    const res = await fetch(`/api/admin/trash/${id}`, { method: "PATCH" });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  }

  async function handlePermanentDelete(id) {
    if (!confirm("Permanently delete this report? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/trash/${id}`, { method: "DELETE" });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  }

  function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function scoreColorClass(score) {
    if (score >= 70) return styles.scoreGood;
    if (score >= 40) return styles.scoreAverage;
    return styles.scorePoor;
  }

  if (authLoading || loading) {
    return <p className={styles.loading}>Loading...</p>;
  }

  if (!isAdmin || error) {
    return <p className={styles.denied}>{error || "Access denied. Admin only."}</p>;
  }

  return (
    <>
      <Link href="/dashboard/admin" className={styles.backLink}>
        ← Back to Admin
      </Link>
      <h1 className={styles.heading}>Trash</h1>

      {reports.length === 0 ? (
        <p className={styles.emptyState}>Trash is empty.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className={styles.desktopOnly}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>User</th>
                    <th>Score</th>
                    <th>Results</th>
                    <th>Deleted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className={styles.url}>{r.url}</span>
                      </td>
                      <td>
                        <span className={styles.email}>{r.user_email || "—"}</span>
                      </td>
                      <td>
                        <span className={`${styles.score} ${scoreColorClass(r.overall_score)}`}>
                          {r.overall_score}
                        </span>
                      </td>
                      <td>
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
                      <td>
                        <span className={styles.date}>{formatDateTime(r.deleted_at)}</span>
                      </td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button
                            className={styles.restoreBtn}
                            onClick={() => handleRestore(r.id)}
                            type="button"
                            title="Restore report"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 4 1 10 7 10" />
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                          </button>
                          <button
                            className={styles.permDeleteBtn}
                            onClick={() => handlePermanentDelete(r.id)}
                            type="button"
                            title="Permanently delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className={styles.mobileCards}>
            {reports.map((r) => (
              <div key={r.id} className={styles.mobileCard}>
                <div className={styles.mobileCardHeader}>
                  <span className={styles.mobileCardUrl}>{r.url}</span>
                  <span className={`${styles.score} ${scoreColorClass(r.overall_score)}`}>
                    {r.overall_score}
                  </span>
                </div>
                <div className={styles.mobileCardMeta}>
                  <span>{r.user_email || "—"}</span>
                  <span>Deleted {formatDateTime(r.deleted_at)}</span>
                </div>
                <div className={styles.mobileCardStats}>
                  {r.fail_count > 0 && (
                    <div className={styles.mobileCardStat}>
                      <div className={styles.mobileStatValue}>{r.fail_count}</div>
                      <div className={styles.mobileStatLabel}>Fail</div>
                    </div>
                  )}
                  {r.warning_count > 0 && (
                    <div className={styles.mobileCardStat}>
                      <div className={styles.mobileStatValue}>{r.warning_count}</div>
                      <div className={styles.mobileStatLabel}>Warning</div>
                    </div>
                  )}
                  {r.pass_count > 0 && (
                    <div className={styles.mobileCardStat}>
                      <div className={styles.mobileStatValue}>{r.pass_count}</div>
                      <div className={styles.mobileStatLabel}>Pass</div>
                    </div>
                  )}
                </div>
                <div className={styles.mobileCardFooter}>
                  <button
                    className={styles.mobileRestoreBtn}
                    onClick={() => handleRestore(r.id)}
                    type="button"
                  >
                    Restore
                  </button>
                  <button
                    className={styles.mobileDeleteBtn}
                    onClick={() => handlePermanentDelete(r.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

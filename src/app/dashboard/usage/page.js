"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

export default function UsagePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/usage");
      if (res.ok) {
        setStats(await res.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <p className={styles.loading}>Loading usage stats...</p>;
  }

  if (!stats) {
    return <p className={styles.empty}>Could not load usage data.</p>;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function handleView(url) {
    window.open(`/?url=${encodeURIComponent(url)}`, "_blank");
  }

  return (
    <>
      <h1 className={styles.heading}>Usage</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalAnalyses}</div>
          <div className={styles.statLabel}>Total Analyses</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.monthlyAnalyses}</div>
          <div className={styles.statLabel}>This Month</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.todayAnalyses}</div>
          <div className={styles.statLabel}>Today</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.uniqueUrls}</div>
          <div className={styles.statLabel}>Unique URLs</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        {stats.recentLogs.length === 0 ? (
          <p className={styles.empty}>No activity yet.</p>
        ) : (
          <div className={styles.logList}>
            {stats.recentLogs.map((log, i) => (
              <div key={i} className={styles.logItem}>
                <span className={styles.logUrl}>{log.url}</span>
                <div className={styles.logDateTime}>
                  <span className={styles.logDate}>{formatDate(log.created_at)}</span>
                  <span className={styles.logTime}>{formatTime(log.created_at)}</span>
                </div>
                <button
                  className={styles.viewBtn}
                  onClick={() => handleView(log.url)}
                  type="button"
                  title="Analyze URL"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

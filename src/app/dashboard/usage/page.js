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
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("100px", "28px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("40%", "28px", "0.5rem")} /><div style={b("60%", "12px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div style={b("140px", "20px", "1rem")} />
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px solid var(--color-border)" }}>
              <div style={b("60%", "14px")} />
              <div style={b("80px", "12px")} />
              <div style={b("50px", "12px")} />
            </div>
          ))}
        </div>
      </>
    );
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

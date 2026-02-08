"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

function formatGaDate(dateStr) {
  // GA4 dates come as "YYYYMMDD"
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return `${y}-${m}-${d}`;
}

export default function AnalyticsDetailedPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "detailed" }),
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        const json = await res.json();
        setError(json.error || "Failed to load analytics data");
      }
    } catch {
      setError("Failed to load analytics data");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  function formatBounceRate(rate) {
    return `${(rate * 100).toFixed(1)}%`;
  }

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <div className={styles.page}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("200px", "28px", "0.5rem")} />
        <div style={b("350px", "14px", "1.5rem")} />
        {[1,2,3,4].map(i => (
          <div key={i} className={styles.section}>
            <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
            <div style={b("100%", "160px")} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Detailed Analytics</h1>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className={styles.heading}>Detailed Analytics</h1>
          <p className={styles.subheading}>In-depth metrics for the last 30 days.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadData}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Daily Metrics */}
      {data?.dailyMetrics?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Daily Metrics</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sessions</th>
                <th>Users</th>
                <th>Pageviews</th>
                <th>Bounce Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyMetrics.map((row, i) => (
                <tr key={i}>
                  <td>{formatGaDate(row.date)}</td>
                  <td>{row.sessions.toLocaleString()}</td>
                  <td>{row.users.toLocaleString()}</td>
                  <td>{row.pageviews.toLocaleString()}</td>
                  <td>{formatBounceRate(row.bounceRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Device Breakdown */}
      {data?.deviceBreakdown?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Device Breakdown</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Device</th>
                <th>Sessions</th>
                <th>Users</th>
                <th>Pageviews</th>
              </tr>
            </thead>
            <tbody>
              {data.deviceBreakdown.map((row, i) => (
                <tr key={i}>
                  <td style={{ textTransform: "capitalize" }}>{row.device}</td>
                  <td>{row.sessions.toLocaleString()}</td>
                  <td>{row.users.toLocaleString()}</td>
                  <td>{row.pageviews.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Countries */}
      {data?.countries?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Countries</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Country</th>
                <th>Sessions</th>
                <th>Users</th>
              </tr>
            </thead>
            <tbody>
              {data.countries.map((row, i) => (
                <tr key={i}>
                  <td>{row.country}</td>
                  <td>{row.sessions.toLocaleString()}</td>
                  <td>{row.users.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Landing Pages */}
      {data?.landingPages?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Landing Pages</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Page</th>
                <th>Sessions</th>
                <th>Users</th>
                <th>Bounce Rate</th>
                <th>Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.landingPages.map((row, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.page}>{row.page}</td>
                  <td>{row.sessions.toLocaleString()}</td>
                  <td>{row.users.toLocaleString()}</td>
                  <td>{formatBounceRate(row.bounceRate)}</td>
                  <td>{formatDuration(row.avgDuration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!data && (
        <div className={styles.emptyState}>
          <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <p>No detailed analytics data available.</p>
        </div>
      )}
    </div>
  );
}

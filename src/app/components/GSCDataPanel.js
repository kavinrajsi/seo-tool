"use client";

import { useState, useEffect } from "react";
import styles from "./GSCDataPanel.module.css";

export default function GSCDataPanel({ url }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!url);
  const [expanded, setExpanded] = useState(true);
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    if (!url) return;

    async function fetchData() {
      try {
        // Check connection status first
        const statusRes = await fetch("/api/gsc/status");
        if (!statusRes.ok) {
          setConnected(false);
          setLoading(false);
          return;
        }
        const status = await statusRes.json();
        if (!status.connected) {
          setConnected(false);
          setLoading(false);
          return;
        }
        setConnected(true);

        // Fetch GSC data
        const res = await fetch("/api/gsc/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (res.ok) {
          const result = await res.json();
          if (!result.error) {
            setData(result);
          }
        }
      } catch {
        // Silently fail — panel just won't show
      }
      setLoading(false);
    }

    fetchData();
  }, [url]);

  // Self-hiding: render nothing if not connected or no data
  if (loading || connected === false || !data) {
    return null;
  }

  const hasQueries = data.queries && data.queries.length > 0;
  const hasIndexStatus = data.indexStatus !== null;

  if (!hasQueries && !hasIndexStatus) {
    return null;
  }

  return (
    <div className={styles.panel}>
      <button
        className={styles.header}
        onClick={() => setExpanded(!expanded)}
        type="button"
        aria-expanded={expanded}
      >
        <div className={styles.headerLeft}>
          <svg className={styles.headerIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className={styles.headerTitle}>Google Search Console Data</span>
          {data.dateRange && (
            <span className={styles.headerDate}>
              {data.dateRange.start} &ndash; {data.dateRange.end}
            </span>
          )}
        </div>
        <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}>
          &#8250;
        </span>
      </button>

      {expanded && (
        <div className={styles.body}>
          {hasQueries && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                Search Queries ({data.queries.length})
              </h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Query</th>
                      <th className={`${styles.th} ${styles.thNum}`}>Clicks</th>
                      <th className={`${styles.th} ${styles.thNum}`}>Impressions</th>
                      <th className={`${styles.th} ${styles.thNum}`}>CTR</th>
                      <th className={`${styles.th} ${styles.thNum}`}>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queries.map((row, i) => (
                      <tr key={i} className={styles.tr}>
                        <td className={styles.td}>{row.query}</td>
                        <td className={`${styles.td} ${styles.tdNum}`}>{row.clicks}</td>
                        <td className={`${styles.td} ${styles.tdNum}`}>{row.impressions.toLocaleString()}</td>
                        <td className={`${styles.td} ${styles.tdNum}`}>{(row.ctr * 100).toFixed(1)}%</td>
                        <td className={`${styles.td} ${styles.tdNum}`}>{row.position.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hasIndexStatus && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Index Status</h4>
              <div className={styles.statusGrid}>
                <div className={styles.statusCard}>
                  <span className={styles.statusLabel}>Coverage</span>
                  <span className={styles.statusValue}>{data.indexStatus.coverageState}</span>
                </div>
                <div className={styles.statusCard}>
                  <span className={styles.statusLabel}>Indexing</span>
                  <span className={styles.statusValue}>{data.indexStatus.indexingState}</span>
                </div>
                {data.indexStatus.lastCrawlTime && (
                  <div className={styles.statusCard}>
                    <span className={styles.statusLabel}>Last Crawl</span>
                    <span className={styles.statusValue}>
                      {new Date(data.indexStatus.lastCrawlTime).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {data.indexStatus.crawledAs && (
                  <div className={styles.statusCard}>
                    <span className={styles.statusLabel}>Crawled As</span>
                    <span className={styles.statusValue}>{data.indexStatus.crawledAs}</span>
                  </div>
                )}
                {data.indexStatus.robotsTxtState && (
                  <div className={styles.statusCard}>
                    <span className={styles.statusLabel}>Robots.txt</span>
                    <span className={styles.statusValue}>{data.indexStatus.robotsTxtState}</span>
                  </div>
                )}
                {data.indexStatus.pageFetchState && (
                  <div className={styles.statusCard}>
                    <span className={styles.statusLabel}>Page Fetch</span>
                    <span className={styles.statusValue}>{data.indexStatus.pageFetchState}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

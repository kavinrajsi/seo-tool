"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

export default function SearchConsolePage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [siteUrl, setSiteUrl] = useState(null);
  const [googleEmail, setGoogleEmail] = useState(null);
  const [connectedAt, setConnectedAt] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [data, setData] = useState(null);
  const [detailedData, setDetailedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (searchParams.get("gsc_connected") === "true") {
        setSuccess("Google Search Console connected successfully!");
      }
      if (searchParams.get("gsc_error")) {
        setError(`Connection failed: ${searchParams.get("gsc_error")}`);
      }
      try {
        const res = await projectFetch("/api/gsc/status");
        if (!active) return;
        if (res.ok) {
          const status = await res.json();
          setConnected(status.connected);
          if (status.connected) {
            setSiteUrl(status.siteUrl);
            setGoogleEmail(status.googleEmail || null);
            setConnectedAt(status.connectedAt || null);
            // Load sites
            try {
              const sitesRes = await projectFetch("/api/gsc/sites");
              if (!active) return;
              if (sitesRes.ok) {
                const siteData = await sitesRes.json();
                setSites(siteData.sites || []);
                if (siteData.selectedSiteUrl) {
                  setSelectedSite(siteData.selectedSiteUrl);
                }
              }
            } catch {
              if (active) setError("Failed to load sites");
            }
            // Load data if site is selected
            if (status.siteUrl) {
              try {
                const [overviewRes, detailedRes] = await Promise.all([
                  projectFetch("/api/gsc/data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reportType: "overview" }),
                  }),
                  projectFetch("/api/gsc/data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reportType: "detailed" }),
                  }),
                ]);
                if (!active) return;
                if (overviewRes.ok) {
                  setData(await overviewRes.json());
                } else {
                  const json = await overviewRes.json();
                  setError(json.error || "Failed to load search console data");
                }
                if (detailedRes.ok) {
                  setDetailedData(await detailedRes.json());
                }
              } catch {
                if (active) setError("Failed to load search console data");
              }
            }
          }
        }
      } catch {
        if (active) setError("Failed to check connection status");
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [searchParams, projectFetch]);

  async function loadData() {
    setLoadingData(true);
    try {
      const [overviewRes, detailedRes] = await Promise.all([
        projectFetch("/api/gsc/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportType: "overview" }),
        }),
        projectFetch("/api/gsc/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportType: "detailed" }),
        }),
      ]);
      if (overviewRes.ok) {
        setData(await overviewRes.json());
      } else {
        const json = await overviewRes.json();
        setError(json.error || "Failed to load search console data");
      }
      if (detailedRes.ok) {
        setDetailedData(await detailedRes.json());
      }
    } catch {
      setError("Failed to load search console data");
    }
    setLoadingData(false);
  }

  async function handleSaveSite() {
    if (!selectedSite) return;
    setSavingSite(true);
    try {
      const res = await fetch("/api/gsc/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: selectedSite, project_id: activeProjectId || null }),
      });
      if (res.ok) {
        setSiteUrl(selectedSite);
        setSuccess("Site saved successfully!");
        await loadData();
      } else {
        setError("Failed to save site");
      }
    } catch {
      setError("Failed to save site");
    }
    setSavingSite(false);
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect Google Search Console?")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/gsc/disconnect", { method: "POST" });
      if (res.ok) {
        setConnected(false);
        setSiteUrl(null);
        setSites([]);
        setData(null);
        setDetailedData(null);
        setSuccess("Google Search Console disconnected.");
      } else {
        setError("Failed to disconnect");
      }
    } catch {
      setError("Network error");
    }
    setDisconnecting(false);
  }

  function formatCtr(ctr) {
    return `${(ctr * 100).toFixed(1)}%`;
  }

  function formatPosition(pos) {
    return pos.toFixed(1);
  }

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("250px", "28px", "0.5rem")} />
        <div style={b("350px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div style={b("100%", "200px")} />
        </div>
      </>
    );
  }

  if (!connected) {
    return (
      <>
        <h1 className={styles.heading}>Google Search Console</h1>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.connectPrompt}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "#4285F4", marginBottom: "1rem" }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h2 style={{ color: "var(--color-text)", margin: "0 0 0.5rem" }}>Connect Google Search Console</h2>
          <p>Link your Search Console account to view search performance, top queries, and page insights.</p>
          <a href="/api/gsc/connect" className={styles.connectBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Connect Search Console
          </a>
        </div>
      </>
    );
  }

  // Connected but no site selected
  if (!siteUrl) {
    return (
      <>
        <h1 className={styles.heading}>Google Search Console</h1>
        <p className={styles.subheading}>Select a site to view search performance data.</p>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.siteSelector}>
          <label style={{ fontWeight: 500, color: "var(--color-text)", whiteSpace: "nowrap" }}>Site:</label>
          <select
            className={styles.siteSelect}
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
          >
            <option value="">Select a site...</option>
            {sites.map((s) => (
              <option key={s.siteUrl} value={s.siteUrl}>
                {s.siteUrl}
              </option>
            ))}
          </select>
          <button
            className={styles.siteSaveBtn}
            onClick={handleSaveSite}
            disabled={!selectedSite || savingSite}
          >
            {savingSite ? "Saving..." : "Save"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className={styles.heading}>Google Search Console</h1>
          <p className={styles.subheading}>Search performance for the last 30 days.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadData} disabled={loadingData}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {loadingData ? "Loading..." : "Refresh"}
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {/* Site Info */}
      {siteUrl && (
        <div className={styles.siteCard}>
          {sites.length > 1 && (
            <div className={styles.siteChangeRow}>
              <select
                className={styles.siteSelect}
                value={selectedSite || siteUrl}
                onChange={(e) => setSelectedSite(e.target.value)}
              >
                {sites.map((s) => (
                  <option key={s.siteUrl} value={s.siteUrl}>
                    {s.siteUrl}
                  </option>
                ))}
              </select>
              <button
                className={styles.siteSaveBtn}
                onClick={handleSaveSite}
                disabled={!selectedSite || selectedSite === siteUrl || savingSite}
              >
                {savingSite ? "Saving..." : "Change"}
              </button>
            </div>
          )}
          <div className={styles.siteCardGrid}>
            <div className={styles.siteField}>
              <span className={styles.siteFieldLabel}>Site</span>
              <span className={styles.siteFieldValue}>{siteUrl}</span>
            </div>
            <div className={styles.siteField}>
              <span className={styles.siteFieldLabel}>Google Account</span>
              <span className={styles.siteFieldValue}>{googleEmail || "\u2014"}</span>
            </div>
            {connectedAt && (
              <div className={styles.siteField}>
                <span className={styles.siteFieldLabel}>Connected</span>
                <span className={styles.siteFieldValue}>
                  {new Date(connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {data?.summary && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Clicks</div>
            <div className={styles.statValue}>{data.summary.clicks.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Impressions</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{data.summary.impressions.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>CTR</div>
            <div className={styles.statValue}>{formatCtr(data.summary.ctr)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Avg Position</div>
            <div className={styles.statValue}>{formatPosition(data.summary.position)}</div>
          </div>
        </div>
      )}

      {/* Top Queries */}
      {data?.topQueries?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Queries</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Query</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {data.topQueries.map((row, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.query}>{row.query}</td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{formatCtr(row.ctr)}</td>
                  <td>{formatPosition(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Pages */}
      {data?.topPages?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Pages</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Page</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {data.topPages.map((row, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.page}>{row.page}</td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{formatCtr(row.ctr)}</td>
                  <td>{formatPosition(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily Metrics */}
      {detailedData?.dailyMetrics?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Daily Metrics</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {detailedData.dailyMetrics.map((row, i) => (
                <tr key={i}>
                  <td>{row.date}</td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{formatCtr(row.ctr)}</td>
                  <td>{formatPosition(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Device Breakdown */}
      {detailedData?.deviceBreakdown?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Device Breakdown</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Device</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {detailedData.deviceBreakdown.map((row, i) => (
                <tr key={i}>
                  <td style={{ textTransform: "capitalize" }}>{row.device}</td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{formatCtr(row.ctr)}</td>
                  <td>{formatPosition(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Countries */}
      {detailedData?.topCountries?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Countries</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Country</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {detailedData.topCountries.map((row, i) => (
                <tr key={i}>
                  <td>{row.country}</td>
                  <td>{row.clicks.toLocaleString()}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{formatCtr(row.ctr)}</td>
                  <td>{formatPosition(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!data && !loadingData && (
        <div className={styles.emptyState}>
          <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>No search console data available yet.</p>
        </div>
      )}
    </>
  );
}

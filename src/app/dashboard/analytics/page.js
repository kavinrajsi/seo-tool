"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

export default function AnalyticsOverviewPage() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [propertyId, setPropertyId] = useState(null);
  const [googleEmail, setGoogleEmail] = useState(null);
  const [connectedAt, setConnectedAt] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [data, setData] = useState(null);
  const [detailedData, setDetailedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  async function loadData() {
    setLoadingData(true);
    try {
      const [overviewRes, detailedRes] = await Promise.all([
        fetch("/api/analytics/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportType: "overview" }),
        }),
        fetch("/api/analytics/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportType: "detailed" }),
        }),
      ]);
      if (overviewRes.ok) {
        setData(await overviewRes.json());
      } else {
        const json = await overviewRes.json();
        setError(json.error || "Failed to load analytics data");
      }
      if (detailedRes.ok) {
        setDetailedData(await detailedRes.json());
      }
    } catch {
      setError("Failed to load analytics data");
    }
    setLoadingData(false);
  }

  async function checkStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/status");
      if (res.ok) {
        const status = await res.json();
        setConnected(status.connected);
        if (status.connected) {
          setPropertyId(status.propertyId);
          setGoogleEmail(status.googleEmail || null);
          setConnectedAt(status.connectedAt || null);
          await loadProperties();
          if (status.propertyId) {
            await loadData();
          }
        }
      }
    } catch {
      setError("Failed to check connection status");
    }
    setLoading(false);
  }

  async function loadProperties() {
    try {
      const res = await fetch("/api/analytics/properties");
      if (res.ok) {
        const propData = await res.json();
        setProperties(propData.properties || []);
        if (propData.selectedPropertyId) {
          setSelectedProperty(propData.selectedPropertyId);
        }
      }
    } catch {
      setError("Failed to load properties");
    }
  }

  useEffect(() => {
    if (searchParams.get("ga_connected") === "true") {
      setSuccess("Google Analytics connected successfully!");
    }
    if (searchParams.get("ga_error")) {
      setError(`Connection failed: ${searchParams.get("ga_error")}`);
    }
    checkStatus();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveProperty() {
    if (!selectedProperty) return;
    setSavingProperty(true);
    try {
      const res = await fetch("/api/analytics/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: selectedProperty }),
      });
      if (res.ok) {
        setPropertyId(selectedProperty);
        setSuccess("Property saved successfully!");
        await loadData();
      } else {
        setError("Failed to save property");
      }
    } catch {
      setError("Failed to save property");
    }
    setSavingProperty(false);
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect Google Analytics?")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/analytics/disconnect", { method: "POST" });
      if (res.ok) {
        setConnected(false);
        setPropertyId(null);
        setProperties([]);
        setData(null);
        setSuccess("Google Analytics disconnected.");
      } else {
        setError("Failed to disconnect");
      }
    } catch {
      setError("Network error");
    }
    setDisconnecting(false);
  }

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  function formatBounceRate(rate) {
    return `${(rate * 100).toFixed(1)}%`;
  }

  function formatGaDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <div className={styles.page}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("200px", "28px", "0.5rem")} />
        <div style={b("350px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div style={b("100%", "200px")} />
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Google Analytics</h1>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.connectPrompt}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "#4285F4", marginBottom: "1rem" }}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <h2 style={{ color: "var(--color-text)", margin: "0 0 0.5rem" }}>Connect Google Analytics</h2>
          <p>Link your Google Analytics account to view traffic data, top pages, and audience insights.</p>
          <a href="/api/analytics/connect" className={styles.connectBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Connect Google Analytics
          </a>
        </div>
      </div>
    );
  }

  // Connected but no property selected
  if (!propertyId) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Google Analytics</h1>
        <p className={styles.subheading}>Select a GA4 property to view analytics data.</p>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.propertySelector}>
          <label style={{ fontWeight: 500, color: "var(--color-text)", whiteSpace: "nowrap" }}>GA4 Property:</label>
          <select
            className={styles.propertySelect}
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
          >
            <option value="">Select a property...</option>
            {properties.map((p) => (
              <option key={p.propertyId} value={p.propertyId}>
                {p.displayName} ({p.accountName})
              </option>
            ))}
          </select>
          <button
            className={styles.propertySaveBtn}
            onClick={handleSaveProperty}
            disabled={!selectedProperty || savingProperty}
          >
            {savingProperty ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className={styles.heading}>Google Analytics</h1>
          <p className={styles.subheading}>Traffic overview for the last 30 days.</p>
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

      {/* Property Info */}
      {propertyId && (
        <div className={styles.propertyCard}>
          {properties.length > 1 && (
            <div className={styles.propertyChangeRow}>
              <select
                className={styles.propertySelect}
                value={selectedProperty || propertyId}
                onChange={(e) => setSelectedProperty(e.target.value)}
              >
                {properties.map((p) => (
                  <option key={p.propertyId} value={p.propertyId}>
                    {p.displayName} ({p.accountName})
                  </option>
                ))}
              </select>
              <button
                className={styles.propertySaveBtn}
                onClick={handleSaveProperty}
                disabled={!selectedProperty || selectedProperty === propertyId || savingProperty}
              >
                {savingProperty ? "Saving..." : "Change"}
              </button>
            </div>
          )}
          <div className={styles.propertyCardGrid}>
            {(() => {
              const currentProp = properties.find((p) => p.propertyId === propertyId);
              return (
                <>
                  <div className={styles.propertyField}>
                    <span className={styles.propertyFieldLabel}>Property</span>
                    <span className={styles.propertyFieldValue}>{currentProp?.displayName || "—"}</span>
                  </div>
                  <div className={styles.propertyField}>
                    <span className={styles.propertyFieldLabel}>Property ID</span>
                    <span className={styles.propertyFieldValue}>{propertyId}</span>
                  </div>
                  <div className={styles.propertyField}>
                    <span className={styles.propertyFieldLabel}>Account</span>
                    <span className={styles.propertyFieldValue}>{currentProp?.accountName || "—"}</span>
                  </div>
                  <div className={styles.propertyField}>
                    <span className={styles.propertyFieldLabel}>Google Account</span>
                    <span className={styles.propertyFieldValue}>{googleEmail || "—"}</span>
                  </div>
                  {connectedAt && (
                    <div className={styles.propertyField}>
                      <span className={styles.propertyFieldLabel}>Connected</span>
                      <span className={styles.propertyFieldValue}>
                        {new Date(connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {data?.summary && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Sessions</div>
            <div className={styles.statValue}>{data.summary.sessions.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Users</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{data.summary.users.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pageviews</div>
            <div className={styles.statValue}>{data.summary.pageviews.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Bounce Rate</div>
            <div className={styles.statValue}>{formatBounceRate(data.summary.bounceRate)}</div>
          </div>
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
                <th>Pageviews</th>
                <th>Users</th>
                <th>Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.topPages.map((row, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.page}>{row.page}</td>
                  <td>{row.pageviews.toLocaleString()}</td>
                  <td>{row.users.toLocaleString()}</td>
                  <td>{formatDuration(row.avgDuration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Traffic Sources */}
      {data?.trafficSources?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Traffic Sources</h2>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Channel</th>
                <th>Sessions</th>
                <th>Users</th>
              </tr>
            </thead>
            <tbody>
              {data.trafficSources.map((row, i) => (
                <tr key={i}>
                  <td>{row.channel}</td>
                  <td>{row.sessions.toLocaleString()}</td>
                  <td>{row.users.toLocaleString()}</td>
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
                <th>Sessions</th>
                <th>Users</th>
                <th>Pageviews</th>
                <th>Bounce Rate</th>
              </tr>
            </thead>
            <tbody>
              {detailedData.dailyMetrics.map((row, i) => (
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
      {detailedData?.deviceBreakdown?.length > 0 && (
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
              {detailedData.deviceBreakdown.map((row, i) => (
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
      {detailedData?.countries?.length > 0 && (
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
              {detailedData.countries.map((row, i) => (
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
      {detailedData?.landingPages?.length > 0 && (
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
              {detailedData.landingPages.map((row, i) => (
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

      {!data && !loadingData && (
        <div className={styles.emptyState}>
          <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <p>No analytics data available yet.</p>
        </div>
      )}
    </div>
  );
}

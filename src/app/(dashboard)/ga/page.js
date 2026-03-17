"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./ga.module.scss";

function BarChart({ rows, maxVal }) {
  const max = maxVal || Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className={styles.barRows}>
      {rows.map((row) => (
        <div key={row.label} className={styles.barRow}>
          <span className={styles.barLabel} title={row.label}>{row.label}</span>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles[row.color] || styles.barBlue}`}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className={styles.barCount}>{row.display || row.value}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data, valueKey }) {
  if (!data || data.length === 0) return null;
  const values = data.map((d) => d[valueKey]);
  const max = Math.max(...values, 1);

  return (
    <>
      <div className={styles.trendChart}>
        {data.map((d) => (
          <div
            key={d.date}
            className={styles.trendBar}
            style={{ height: `${(d[valueKey] / max) * 100}%` }}
            data-tooltip={`${d.date}: ${d[valueKey].toLocaleString()}`}
          />
        ))}
      </div>
      {data.length > 1 && (
        <div className={styles.trendLabels}>
          <span>{data[0].date}</span>
          <span>{data[data.length - 1].date}</span>
        </div>
      )}
    </>
  );
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function GoogleAnalyticsPage() {
  return (
    <Suspense fallback={<div className={styles.page}><div className={styles.loading}><span className={styles.loadingSpin} />Loading...</div></div>}>
      <GoogleAnalyticsContent />
    </Suspense>
  );
}

function GoogleAnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  // Properties & sites
  const [properties, setProperties] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [dateRange, setDateRange] = useState("30");

  // Data
  const [gaData, setGaData] = useState(null);
  const [scData, setScData] = useState(null);
  const [dateInfo, setDateInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // History
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        router.push("/signin");
        return;
      }
      setUser(u);

      // Check if connected
      const { data: tokenRow } = await supabase
        .from("google_tokens")
        .select("user_id")
        .eq("user_id", u.id)
        .single();

      if (tokenRow) {
        setConnected(true);
        await loadProperties();
        await loadHistory(u.id);
      }

      // Check URL params for status
      if (searchParams.get("connected") === "true") {
        setConnected(true);
        await loadProperties();
        await loadHistory(u.id);
      }
      if (searchParams.get("error")) {
        setError("Failed to connect Google account. Please try again.");
      }

      setLoading(false);
    }
    init();
  }, [router, searchParams]);

  async function loadProperties() {
    try {
      const res = await fetch("/api/ga/properties");
      if (!res.ok) return;
      const data = await res.json();
      setProperties(data.properties || []);
      setSites(data.sites || []);
    } catch {
      // Silently fail — user can retry
    }
  }

  async function loadHistory(userId) {
    const { data } = await supabase
      .from("ga_reports")
      .select("id, property_id, site_url, date_range, fetched_at")
      .eq("user_id", userId)
      .order("fetched_at", { ascending: false })
      .limit(5);
    if (data) setHistory(data);
  }

  async function handleFetch() {
    if (!selectedProperty && !selectedSite) return;

    setError("");
    setFetching(true);
    setGaData(null);
    setScData(null);

    try {
      const res = await fetch("/api/ga/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedProperty || null,
          siteUrl: selectedSite || null,
          dateRange,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to fetch data");
        setFetching(false);
        return;
      }

      setGaData(json.gaData);
      setScData(json.scData);
      setDateInfo(json.dateRange);
      setActiveTab("overview");

      if (user) await loadHistory(user.id);
    } catch {
      setError("Network error. Please try again.");
    }

    setFetching(false);
  }

  async function handleDisconnect() {
    if (!user) return;
    await supabase.from("google_tokens").delete().eq("user_id", user.id);
    setConnected(false);
    setProperties([]);
    setSites([]);
    setGaData(null);
    setScData(null);
    setHistory([]);
  }

  async function loadReport(reportId) {
    const { data } = await supabase
      .from("ga_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (data) {
      setGaData(data.ga_data);
      setScData(data.sc_data);
      const parts = data.date_range.split(" to ");
      setDateInfo({ start: parts[0], end: parts[1] });
      setActiveTab("overview");
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <span className={styles.loadingSpin} />
          Loading...
        </div>
      </div>
    );
  }

  const ga = gaData;
  const sc = scData;
  const hasData = ga || sc;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {connected && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span className={styles.connectedBadge}>
              <span className={styles.connectedDot} />
              Connected
            </span>
            <button className={styles.disconnectBtn} onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!connected ? (
          <div className={styles.connectCard}>
            <h2>Connect Google Account</h2>
            <p>
              Link your Google account to access Analytics and Search Console data.
              We only request read-only access to your data.
            </p>
            <a href="/api/google/auth" className={styles.connectBtn}>
              Connect with Google
            </a>
          </div>
        ) : (
          <>
            {/* Property & Site Selectors */}
            <div className={styles.selectors}>
              <div className={styles.selectGroup}>
                <label>GA4 Property</label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                >
                  <option value="">Select property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.account})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.selectGroup}>
                <label>Search Console Site</label>
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                >
                  <option value="">Select site...</option>
                  {sites.map((s) => (
                    <option key={s.url} value={s.url}>
                      {s.url}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.selectGroup}>
                <label>Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              <button
                className={styles.fetchBtn}
                onClick={handleFetch}
                disabled={fetching || (!selectedProperty && !selectedSite)}
              >
                {fetching ? "Fetching..." : "Fetch Data"}
              </button>
            </div>

            {fetching && (
              <div className={styles.loading}>
                <span className={styles.loadingSpin} />
                Fetching analytics data...
              </div>
            )}

            {hasData && (
              <>
                {dateInfo && (
                  <div className={styles.dateInfo}>
                    Data from {dateInfo.start} to {dateInfo.end}
                  </div>
                )}

                {/* Summary Bar */}
                {ga && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <div className={styles.summaryValue}>{formatNumber(ga.overview.activeUsers)}</div>
                      <div className={styles.summaryLabel}>Active Users</div>
                    </div>
                    <div className={styles.summaryItem}>
                      <div className={styles.summaryValue}>{formatNumber(ga.overview.sessions)}</div>
                      <div className={styles.summaryLabel}>Sessions</div>
                    </div>
                    <div className={styles.summaryItem}>
                      <div className={styles.summaryValue}>{formatNumber(ga.overview.pageViews)}</div>
                      <div className={styles.summaryLabel}>Page Views</div>
                    </div>
                    <div className={styles.summaryItem}>
                      <div className={styles.summaryValue}>{(ga.overview.bounceRate * 100).toFixed(1)}%</div>
                      <div className={styles.summaryLabel}>Bounce Rate</div>
                    </div>
                    <div className={styles.summaryItem}>
                      <div className={styles.summaryValue}>{formatDuration(ga.overview.avgSessionDuration)}</div>
                      <div className={styles.summaryLabel}>Avg Session</div>
                    </div>
                    <div className={styles.summaryItem}>
                      <div className={styles.summaryValue}>{formatNumber(ga.overview.newUsers)}</div>
                      <div className={styles.summaryLabel}>New Users</div>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className={styles.tabs}>
                  {ga && (
                    <>
                      <button
                        className={`${styles.tab} ${activeTab === "overview" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("overview")}
                      >
                        Overview
                      </button>
                      <button
                        className={`${styles.tab} ${activeTab === "pages" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("pages")}
                      >
                        Pages
                      </button>
                      <button
                        className={`${styles.tab} ${activeTab === "sources" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("sources")}
                      >
                        Traffic Sources
                      </button>
                    </>
                  )}
                  {sc && (
                    <>
                      <button
                        className={`${styles.tab} ${activeTab === "queries" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("queries")}
                      >
                        Search Queries
                      </button>
                      <button
                        className={`${styles.tab} ${activeTab === "search-pages" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("search-pages")}
                      >
                        Search Pages
                      </button>
                    </>
                  )}
                </div>

                {/* ── Overview Tab ───────────── */}
                {activeTab === "overview" && ga && (
                  <div className={styles.grid}>
                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Daily Users Trend</h3>
                      <TrendChart data={ga.dailyTrend} valueKey="users" />
                    </div>

                    <div className={styles.card}>
                      <h3>Traffic Sources</h3>
                      <BarChart
                        rows={ga.trafficSources.map((s, i) => ({
                          label: s.channel,
                          value: s.sessions,
                          color: ["barBlue", "barGreen", "barPurple", "barOrange", "barCyan", "barTeal"][i % 6],
                        }))}
                      />
                    </div>

                    <div className={styles.card}>
                      <h3>Devices</h3>
                      <BarChart
                        rows={ga.devices.map((d) => ({
                          label: d.device,
                          value: d.sessions,
                          color: d.device === "desktop" ? "barBlue" : d.device === "mobile" ? "barGreen" : "barPurple",
                        }))}
                      />
                    </div>

                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Top Countries</h3>
                      <BarChart
                        rows={ga.countries.map((c) => ({
                          label: c.country,
                          value: c.users,
                          display: `${c.users} users`,
                          color: "barTeal",
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* ── Pages Tab ──────────────── */}
                {activeTab === "pages" && ga && (
                  <div className={styles.grid}>
                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Top Pages</h3>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Page Path</th>
                            <th className="right">Views</th>
                            <th className="right">Users</th>
                            <th className="right">Avg Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ga.topPages.map((p) => (
                            <tr key={p.path}>
                              <td className={styles.path}>{p.path}</td>
                              <td className={styles.mono}>{p.views.toLocaleString()}</td>
                              <td className={styles.mono}>{p.users.toLocaleString()}</td>
                              <td className={styles.mono}>{formatDuration(p.avgDuration)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Daily Page Views Trend</h3>
                      <TrendChart data={ga.dailyTrend} valueKey="pageViews" />
                    </div>
                  </div>
                )}

                {/* ── Traffic Sources Tab ────── */}
                {activeTab === "sources" && ga && (
                  <div className={styles.grid}>
                    <div className={styles.card}>
                      <h3>Channel Breakdown</h3>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Channel</th>
                            <th className="right">Sessions</th>
                            <th className="right">Users</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ga.trafficSources.map((s) => (
                            <tr key={s.channel}>
                              <td>{s.channel}</td>
                              <td className={styles.mono}>{s.sessions.toLocaleString()}</td>
                              <td className={styles.mono}>{s.users.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.card}>
                      <h3>Device Breakdown</h3>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Device</th>
                            <th className="right">Sessions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ga.devices.map((d) => (
                            <tr key={d.device}>
                              <td>{d.device}</td>
                              <td className={styles.mono}>{d.sessions.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Daily Sessions Trend</h3>
                      <TrendChart data={ga.dailyTrend} valueKey="sessions" />
                    </div>
                  </div>
                )}

                {/* ── Search Queries Tab ─────── */}
                {activeTab === "queries" && sc && (
                  <div className={styles.grid}>
                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Top Search Queries</h3>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Query</th>
                            <th className="right">Clicks</th>
                            <th className="right">Impressions</th>
                            <th className="right">CTR</th>
                            <th className="right">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sc.topQueries.map((q) => (
                            <tr key={q.query}>
                              <td>{q.query}</td>
                              <td className={styles.mono}>{q.clicks.toLocaleString()}</td>
                              <td className={styles.mono}>{q.impressions.toLocaleString()}</td>
                              <td className={styles.mono}>{q.ctr}%</td>
                              <td className={styles.mono}>{q.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.card}>
                      <h3>Search Devices</h3>
                      <BarChart
                        rows={sc.searchDevices.map((d) => ({
                          label: d.device,
                          value: d.clicks,
                          display: `${d.clicks} clicks`,
                          color: d.device === "DESKTOP" ? "barBlue" : d.device === "MOBILE" ? "barGreen" : "barPurple",
                        }))}
                      />
                    </div>

                    <div className={styles.card}>
                      <h3>Search by Country</h3>
                      <BarChart
                        rows={sc.searchCountries.map((c) => ({
                          label: c.country,
                          value: c.clicks,
                          display: `${c.clicks} clicks`,
                          color: "barTeal",
                        }))}
                      />
                    </div>

                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Daily Clicks Trend</h3>
                      <TrendChart data={sc.searchTrend} valueKey="clicks" />
                    </div>
                  </div>
                )}

                {/* ── Search Pages Tab ────────── */}
                {activeTab === "search-pages" && sc && (
                  <div className={styles.grid}>
                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Top Pages in Search</h3>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Page</th>
                            <th className="right">Clicks</th>
                            <th className="right">Impressions</th>
                            <th className="right">CTR</th>
                            <th className="right">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sc.searchPages.map((p) => (
                            <tr key={p.page}>
                              <td className={styles.path}>{p.page}</td>
                              <td className={styles.mono}>{p.clicks.toLocaleString()}</td>
                              <td className={styles.mono}>{p.impressions.toLocaleString()}</td>
                              <td className={styles.mono}>{p.ctr}%</td>
                              <td className={styles.mono}>{p.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={`${styles.card} ${styles.cardWide}`}>
                      <h3>Daily Impressions Trend</h3>
                      <TrendChart data={sc.searchTrend} valueKey="impressions" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Report History */}
            {history.length > 0 && !fetching && (
              <div style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                  Recent Reports
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => loadReport(h.id)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "#141414",
                        border: "1px solid #1a1a1a",
                        color: "inherit",
                        cursor: "pointer",
                        fontFamily: "var(--font-ibm-sans)",
                        fontSize: 13,
                        textAlign: "left",
                        transition: "border-color 0.15s",
                      }}
                    >
                      <span style={{ color: "#ededed" }}>
                        {h.property_id && `GA: ${h.property_id}`}
                        {h.property_id && h.site_url && " | "}
                        {h.site_url && `SC: ${h.site_url}`}
                      </span>
                      <span style={{ color: "#666", fontSize: 12 }}>
                        {new Date(h.fetched_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

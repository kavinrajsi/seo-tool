"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CloudIcon,
  EyeIcon,
  UsersIcon,
  GlobeIcon,
  ShieldAlertIcon,
  ActivityIcon,
  MonitorIcon,
  ArrowUpDownIcon,
  KeyIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LoaderIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  HardDriveIcon,
} from "lucide-react";

/* ── Date range options ───────────────────────────────────────────── */
const DATE_RANGES = [
  { label: "24 hours", value: "1" },
  { label: "7 days", value: "7" },
  { label: "14 days", value: "14" },
  { label: "30 days", value: "30" },
];

/* ── Format helpers ───────────────────────────────────────────────── */
function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtBytes(bytes) {
  if (bytes >= 1e12) return (bytes / 1e12).toFixed(2) + " TB";
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + " MB";
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + " KB";
  return bytes + " B";
}

function statusColor(code) {
  if (code < 300) return "text-emerald-400";
  if (code < 400) return "text-blue-400";
  if (code < 500) return "text-amber-400";
  return "text-red-400";
}

/* ── SVG Bar chart ────────────────────────────────────────────────── */
function BarChart({ data, dataKey, color, height = 120 }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  const barWidth = Math.max(4, Math.min(16, Math.floor(500 / data.length) - 2));
  const w = data.length * (barWidth + 2);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d[dataKey] / max) * (height - 4);
        return (
          <rect
            key={i}
            x={i * (barWidth + 2)}
            y={height - h}
            width={barWidth}
            height={h}
            rx={2}
            fill={color}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

/* ── SVG Line chart ───────────────────────────────────────────────── */
function LineChart({ data, dataKey, color, height = 120 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  const w = 500;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - (d[dataKey] / max) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth={2} points={points} />
    </svg>
  );
}

/* ── Donut chart ──────────────────────────────────────────────────── */
function DonutChart({ items, size = 140 }) {
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size}>
      {items.slice(0, 8).map((item, i) => {
        const pct = item.value / total;
        const dash = pct * circ;
        const seg = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={14}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            className="-rotate-90 origin-center"
          />
        );
        offset += dash;
        return seg;
      })}
    </svg>
  );
}

/* ── Stat card ────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = "text-blue-400" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function CloudflareAnalyticsPage() {
  const [apiToken, setApiToken] = useState("");
  const [savedToken, setSavedToken] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [dateRange, setDateRange] = useState("7");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [history, setHistory] = useState([]);

  // Load saved token from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: tokenRow } = await supabase
          .from("cloudflare_tokens")
          .select("api_token")
          .eq("user_id", user.id)
          .single();

        if (tokenRow?.api_token) {
          setSavedToken(tokenRow.api_token);
          setApiToken(tokenRow.api_token);
          fetchZones(tokenRow.api_token);
        }

        // Load history
        const { data: historyRows } = await supabase
          .from("cloudflare_analytics")
          .select("id, zone_name, date_range, totals, fetched_at")
          .eq("user_id", user.id)
          .order("fetched_at", { ascending: false })
          .limit(10);

        if (historyRows) setHistory(historyRows);
      } catch {
        // Not logged in or table doesn't exist yet
      }
    })();
  }, []);

  async function fetchZones(token) {
    setZonesLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cloudflare/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setZones(data.zones);
      setTokenVerified(true);
      if (data.zones.length === 1) setSelectedZone(data.zones[0]);
    } catch (err) {
      setError(err.message);
      setTokenVerified(false);
    } finally {
      setZonesLoading(false);
    }
  }

  async function handleConnect() {
    if (!apiToken.trim()) return;
    await fetchZones(apiToken.trim());

    // Save token to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("cloudflare_tokens").upsert({
          user_id: user.id,
          api_token: apiToken.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        setSavedToken(apiToken.trim());
      }
    } catch {
      // Token save is optional
    }
  }

  async function handleDisconnect() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("cloudflare_tokens").delete().eq("user_id", user.id);
      }
    } catch { /* ignore */ }
    setSavedToken(null);
    setApiToken("");
    setZones([]);
    setSelectedZone(null);
    setAnalytics(null);
    setTokenVerified(false);
  }

  async function fetchAnalytics() {
    if (!selectedZone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cloudflare/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: savedToken || apiToken,
          zoneId: selectedZone.id,
          zoneName: selectedZone.name,
          dateRange,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch when zone or date range changes
  useEffect(() => {
    if (selectedZone && tokenVerified) fetchAnalytics();
  }, [selectedZone, dateRange]);

  /* ── Token input / connect screen ───────────────────────────────── */
  if (!tokenVerified) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <CloudIcon size={28} className="text-orange-400" />
            <h1 className="text-xl font-bold">Connect Cloudflare</h1>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Enter your Cloudflare API token to view analytics for your domains.
            The token needs <strong>Zone Analytics:Read</strong> permission.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <KeyIcon size={16} className="text-muted-foreground shrink-0" />
              <input
                type="password"
                placeholder="Cloudflare API Token"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <button
              onClick={handleConnect}
              disabled={!apiToken.trim() || zonesLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              {zonesLoading ? (
                <><LoaderIcon size={16} className="animate-spin" /> Verifying…</>
              ) : (
                <><CloudIcon size={16} /> Connect Cloudflare</>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400">
              <AlertTriangleIcon size={14} />
              {error}
            </div>
          )}

          <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">How to get your API token:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to <strong>dash.cloudflare.com</strong> → My Profile → API Tokens</li>
              <li>Click <strong>Create Token</strong></li>
              <li>Use the <strong>&quot;Read analytics and zones&quot;</strong> template, or create a custom token with <strong>Zone:Analytics:Read</strong> + <strong>Zone:Zone:Read</strong></li>
              <li>Copy the token and paste it above</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main analytics dashboard ───────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CloudIcon size={24} className="text-orange-400" />
          <div>
            <h1 className="text-xl font-bold">Cloudflare Analytics</h1>
            <p className="text-xs text-muted-foreground">
              {selectedZone ? selectedZone.name : "Select a domain"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zone selector */}
          <div className="relative">
            <select
              value={selectedZone?.id || ""}
              onChange={(e) => {
                const z = zones.find((z) => z.id === e.target.value);
                setSelectedZone(z || null);
              }}
              className="appearance-none rounded-lg border border-border bg-card pl-3 pr-8 py-1.5 text-sm outline-none"
            >
              <option value="">Select domain</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          {/* Date range */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  dateRange === r.value
                    ? "bg-orange-500/20 text-orange-400 font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchAnalytics}
            disabled={loading || !selectedZone}
            className="rounded-lg border border-border p-1.5 hover:bg-muted/50 disabled:opacity-50 transition-colors"
          >
            <RefreshCwIcon size={16} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangleIcon size={14} />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <LoaderIcon size={20} className="animate-spin" />
          <span>Fetching analytics…</span>
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* ── Overview stats ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={ActivityIcon} label="Total Requests" value={fmtNum(analytics.totals.requests)} color="text-blue-400" />
            <StatCard icon={EyeIcon} label="Page Views" value={fmtNum(analytics.totals.pageViews)} color="text-purple-400" />
            <StatCard icon={UsersIcon} label="Unique Visitors" value={fmtNum(analytics.totals.visitors)} color="text-emerald-400" />
            <StatCard icon={ShieldAlertIcon} label="Threats Blocked" value={fmtNum(analytics.totals.threats)} color="text-red-400" />
            <StatCard icon={HardDriveIcon} label="Bandwidth" value={fmtBytes(analytics.totals.bandwidth)} color="text-amber-400" />
          </div>

          {/* ── Traffic trend charts ───────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium mb-1">Requests</h3>
              <p className="text-xs text-muted-foreground mb-3">Daily HTTP requests</p>
              <BarChart data={analytics.dailyTrend} dataKey="requests" color="#3b82f6" />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{analytics.dailyTrend[0]?.date}</span>
                <span>{analytics.dailyTrend[analytics.dailyTrend.length - 1]?.date}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium mb-1">Unique Visitors</h3>
              <p className="text-xs text-muted-foreground mb-3">Daily unique visitors</p>
              <LineChart data={analytics.dailyTrend} dataKey="visitors" color="#22c55e" />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{analytics.dailyTrend[0]?.date}</span>
                <span>{analytics.dailyTrend[analytics.dailyTrend.length - 1]?.date}</span>
              </div>
            </div>
          </div>

          {/* ── Breakdown panels ───────────────────────────────────── */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Countries */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <GlobeIcon size={16} className="text-blue-400" />
                <h3 className="text-sm font-medium">Top Countries</h3>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {analytics.countries.map((c, i) => {
                  const pct = analytics.totals.requests
                    ? ((c.requests / analytics.totals.requests) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{c.country}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                        <span className="text-xs font-medium w-16 text-right">{fmtNum(c.requests)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Browsers */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <MonitorIcon size={16} className="text-purple-400" />
                <h3 className="text-sm font-medium">Browsers</h3>
              </div>
              <div className="flex justify-center mb-3">
                <DonutChart
                  items={analytics.browsers.slice(0, 6).map((b) => ({
                    label: b.name,
                    value: b.pageViews,
                  }))}
                  size={120}
                />
              </div>
              <div className="space-y-1.5">
                {analytics.browsers.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: ["#3b82f6","#8b5cf6","#f59e0b","#22c55e","#ef4444","#06b6d4"][i % 6] }}
                      />
                      <span className="truncate">{b.name}</span>
                    </div>
                    <span className="text-xs font-medium">{fmtNum(b.pageViews)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status codes */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpDownIcon size={16} className="text-amber-400" />
                <h3 className="text-sm font-medium">Status Codes</h3>
              </div>
              <div className="space-y-2">
                {analytics.statusCodes.map((s, i) => {
                  const pct = analytics.totals.requests
                    ? ((s.requests / analytics.totals.requests) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className={`font-mono font-medium ${statusColor(s.code)}`}>{s.code}</span>
                      <div className="flex-1 mx-3">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: s.code < 300 ? "#22c55e" : s.code < 400 ? "#3b82f6" : s.code < 500 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium w-16 text-right">{fmtNum(s.requests)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── HTTP Protocols ─────────────────────────────────────── */}
          {analytics.httpProtocols.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium mb-3">HTTP Protocols</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {analytics.httpProtocols.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{p.protocol}</p>
                    <p className="text-lg font-bold mt-1">{fmtNum(p.requests)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Page views trend ───────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-1">Page Views Trend</h3>
            <p className="text-xs text-muted-foreground mb-3">Daily page views over selected period</p>
            <BarChart data={analytics.dailyTrend} dataKey="pageViews" color="#8b5cf6" height={100} />
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>{analytics.dailyTrend[0]?.date}</span>
              <span>{analytics.dailyTrend[analytics.dailyTrend.length - 1]?.date}</span>
            </div>
          </div>

          {/* ── Bandwidth trend ────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-1">Bandwidth</h3>
            <p className="text-xs text-muted-foreground mb-3">Daily bandwidth served</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <LineChart data={analytics.dailyTrend} dataKey="bandwidth" color="#f59e0b" height={100} />
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>{analytics.dailyTrend[0]?.date}</span>
                  <span>{analytics.dailyTrend[analytics.dailyTrend.length - 1]?.date}</span>
                </div>
              </div>
              <div className="space-y-2">
                {analytics.dailyTrend.slice(-7).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{d.date}</span>
                    <span className="font-medium">{fmtBytes(d.bandwidth)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Threat detail ──────────────────────────────────────── */}
          {analytics.totals.threats > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlertIcon size={16} className="text-red-400" />
                <h3 className="text-sm font-medium text-red-400">Threats Blocked</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {analytics.dailyTrend
                  .filter((d) => d.threats > 0)
                  .slice(-8)
                  .map((d, i) => (
                    <div key={i} className="rounded-lg border border-red-500/20 bg-card p-3 text-center">
                      <p className="text-xs text-muted-foreground">{d.date}</p>
                      <p className="text-lg font-bold text-red-400">{fmtNum(d.threats)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !analytics && selectedZone && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <CloudIcon size={32} />
          <p>Select a date range to view analytics</p>
        </div>
      )}

      {/* ── Fetch history ──────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Recent Reports</h3>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm rounded-lg border border-border px-3 py-2">
                <div>
                  <span className="font-medium">{h.zone_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{h.date_range}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{fmtNum(h.totals?.pageViews || 0)} views</span>
                  <span>{new Date(h.fetched_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

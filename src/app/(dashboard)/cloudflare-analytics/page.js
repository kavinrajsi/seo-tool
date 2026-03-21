"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { logError } from "@/lib/logger";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
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
  GaugeIcon,
  TimerIcon,
  ZapIcon,
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

function fmtMs(ms) {
  if (ms == null) return "—";
  if (ms >= 1000) return (ms / 1000).toFixed(2) + " s";
  return Math.round(ms) + " ms";
}

function vitalColor(metric, value) {
  if (value == null) return "text-muted-foreground";
  if (metric === "lcp") return value <= 2500 ? "text-emerald-400" : value <= 4000 ? "text-amber-400" : "text-red-400";
  if (metric === "inp") return value <= 200 ? "text-emerald-400" : value <= 500 ? "text-amber-400" : "text-red-400";
  if (metric === "cls") return value <= 0.1 ? "text-emerald-400" : value <= 0.25 ? "text-amber-400" : "text-red-400";
  if (metric === "ttfb") return value <= 800 ? "text-emerald-400" : value <= 1800 ? "text-amber-400" : "text-red-400";
  return "text-muted-foreground";
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
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
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

        const { data: tokenRows } = await supabase
          .from("cloudflare_tokens")
          .select("api_token")
          .eq("user_id", user.id)
          .limit(1);

        const tokenRow = tokenRows?.[0];

        if (tokenRow?.api_token) {
          setSavedToken(tokenRow.api_token);
          setApiToken(tokenRow.api_token);
          fetchZones(tokenRow.api_token);
        }

        // Load history
        let historyQuery = supabase
          .from("cloudflare_analytics")
          .select("id, zone_name, date_range, totals, fetched_at")
          .order("fetched_at", { ascending: false })
          .limit(10);

        historyQuery = historyQuery.eq("user_id", user.id);

        const { data: historyRows } = await historyQuery;

        if (historyRows) setHistory(historyRows);
      } catch (err) {
        logError("cloudflare-analytics/load-history", err);
      }
    })();
  }, [activeTeam, activeProject]);

  async function fetchZones(token) {
    setZonesLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/cloudflare/zones", {
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
        }, { onConflict: "user_id" });
        setSavedToken(apiToken.trim());
      }
    } catch (err) {
      logError("cloudflare-analytics/save-token", err);
    }
  }

  async function handleDisconnect() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("cloudflare_tokens").delete().eq("user_id", user.id);
      }
    } catch (err) { logError("cloudflare-analytics/disconnect", err); }
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
      const res = await apiFetch("/api/cloudflare/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: savedToken || apiToken,
          zoneId: selectedZone.id,
          zoneName: selectedZone.name,
          dateRange,
          teamId: activeTeam?.id || null,
          projectId: activeProject?.id || null,
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

  /* ── Not connected — redirect to settings ───────────────────────── */
  if (!tokenVerified) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <CloudIcon size={40} className="text-orange-400" />
        <h2 className="text-lg font-bold">Connect Cloudflare</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Add your Cloudflare API token in Settings to view analytics for your domains.
        </p>
        <a
          href="/settings"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          Go to Settings
        </a>
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
          {/* ── Overview: Requests / Bandwidth / Unique Visitors ───── */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Requests */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <ActivityIcon size={16} className="text-blue-400" />
                <h3 className="text-sm font-medium">Requests</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{fmtNum(analytics.totals.requests)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Cached Requests</p>
                    <p className="text-lg font-semibold text-emerald-400">{fmtNum(analytics.totals.cachedRequests)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Uncached Requests</p>
                    <p className="text-lg font-semibold text-amber-400">{fmtNum(analytics.totals.uncachedRequests)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bandwidth */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <HardDriveIcon size={16} className="text-cyan-400" />
                <h3 className="text-sm font-medium">Bandwidth</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Bandwidth</p>
                  <p className="text-2xl font-bold">{fmtBytes(analytics.totals.bandwidth)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Cached Bandwidth</p>
                    <p className="text-lg font-semibold text-emerald-400">{fmtBytes(analytics.totals.cachedBytes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Uncached Bandwidth</p>
                    <p className="text-lg font-semibold text-amber-400">{fmtBytes(analytics.totals.uncachedBytes)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Unique Visitors */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <UsersIcon size={16} className="text-purple-400" />
                <h3 className="text-sm font-medium">Unique Visitors</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Unique Visitors</p>
                  <p className="text-2xl font-bold">{fmtNum(analytics.totals.visitors)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Maximum Unique Visitors</p>
                    <p className="text-lg font-semibold text-emerald-400">{fmtNum(analytics.totals.maxVisitors)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Minimum Unique Visitors</p>
                    <p className="text-lg font-semibold text-amber-400">{fmtNum(analytics.totals.minVisitors)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Additional stats ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={EyeIcon} label="Page Views" value={fmtNum(analytics.totals.pageViews)} color="text-blue-400" />
            <StatCard icon={ShieldAlertIcon} label="Threats Blocked" value={fmtNum(analytics.totals.threats)} color="text-red-400" />
            <StatCard icon={ActivityIcon} label="Cache Rate" value={analytics.totals.requests ? `${((analytics.totals.cachedRequests / analytics.totals.requests) * 100).toFixed(1)}%` : "0%"} color="text-emerald-400" />
          </div>


          {/* ── Core Web Vitals ────────────────────────────────────── */}
          {analytics.webVitals && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GaugeIcon size={16} className="text-blue-400" />
                  <h3 className="text-sm font-medium">Core Web Vitals</h3>
                </div>
                <span className="text-xs text-muted-foreground">{fmtNum(analytics.webVitals.count)} samples</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* LCP */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Largest Contentful Paint (LCP)</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${vitalColor("lcp", analytics.webVitals.lcp.p75)}`}>
                      {fmtMs(analytics.webVitals.lcp.p75)}
                    </p>
                    <span className="text-xs text-muted-foreground">P75</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Avg: {fmtMs(analytics.webVitals.lcp.avg)}</p>
                </div>
                {/* INP */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Interaction to Next Paint (INP)</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${vitalColor("inp", analytics.webVitals.inp.p75)}`}>
                      {fmtMs(analytics.webVitals.inp.p75)}
                    </p>
                    <span className="text-xs text-muted-foreground">P75</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Avg: {fmtMs(analytics.webVitals.inp.avg)}</p>
                </div>
                {/* CLS */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Cumulative Layout Shift (CLS)</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${vitalColor("cls", analytics.webVitals.cls.p75)}`}>
                      {analytics.webVitals.cls.p75 != null ? analytics.webVitals.cls.p75.toFixed(3) : "—"}
                    </p>
                    <span className="text-xs text-muted-foreground">P75</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Avg: {analytics.webVitals.cls.avg != null ? analytics.webVitals.cls.avg.toFixed(3) : "—"}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TTFB & TTLB Breakdown ───────────────────────────────── */}
          {analytics.performance && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TimerIcon size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-medium">TTFB & Page Load Breakdown</h3>
                </div>
                <span className="text-xs text-muted-foreground">{fmtNum(analytics.performance.count)} samples</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* TTFB */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ZapIcon size={14} className="text-cyan-400" />
                    <p className="text-sm font-medium">Time to First Byte (TTFB)</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">P50</span>
                      <span className={`text-sm font-semibold ${vitalColor("ttfb", analytics.performance.ttfb.p50)}`}>{fmtMs(analytics.performance.ttfb.p50)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">P75</span>
                      <span className={`text-sm font-semibold ${vitalColor("ttfb", analytics.performance.ttfb.p75)}`}>{fmtMs(analytics.performance.ttfb.p75)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">P99</span>
                      <span className="text-sm font-semibold text-muted-foreground">{fmtMs(analytics.performance.ttfb.p99)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Average</span>
                      <span className="text-sm font-semibold">{fmtMs(analytics.performance.ttfb.avg)}</span>
                    </div>
                  </div>
                </div>
                {/* TTLB / Page Load */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TimerIcon size={14} className="text-amber-400" />
                    <p className="text-sm font-medium">Time to Last Byte (Page Load)</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">P50</span>
                      <span className="text-sm font-semibold">{fmtMs(analytics.performance.loadTime.p50)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">P75</span>
                      <span className="text-sm font-semibold">{fmtMs(analytics.performance.loadTime.p75)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">P99</span>
                      <span className="text-sm font-semibold text-muted-foreground">{fmtMs(analytics.performance.loadTime.p99)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Average</span>
                      <span className="text-sm font-semibold">{fmtMs(analytics.performance.loadTime.avg)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Web Traffic Requests by Country ─────────────────────── */}
          {analytics.countries.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <GlobeIcon size={16} className="text-blue-400" />
                <h3 className="text-sm font-medium">Web Traffic Requests by Country</h3>
              </div>
              <div className="space-y-2.5">
                {analytics.countries.map((c, i) => {
                  const pct = analytics.totals.requests
                    ? (c.requests / analytics.totals.requests) * 100
                    : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="truncate flex-1 font-medium">{c.country}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                          <span className="text-xs font-semibold w-16 text-right">{fmtNum(c.requests)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Breakdown panels ───────────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-4">

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

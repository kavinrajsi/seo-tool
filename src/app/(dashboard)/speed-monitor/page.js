"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  GaugeIcon,
  ClockIcon,
  ServerIcon,
  ShieldCheckIcon,
  ActivityIcon,
  FileCodeIcon,
  ArrowRightIcon,
  WifiOffIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";

/* ── Grade helpers ────────────────────────────────────────────────────── */

const GRADE_COLORS = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

function gradeColor(grade) {
  return GRADE_COLORS[grade] || "#6b7280";
}

function statusCodeColor(code) {
  if (code >= 200 && code < 300) return "#22c55e";
  if (code >= 300 && code < 400) return "#eab308";
  return "#ef4444";
}

/* ── Simple SVG bar chart for the 3 fetch times ──────────────────────── */

function FetchTimesChart({ times }) {
  if (!times || times.length === 0) return null;
  const max = Math.max(...times, 1);
  const barWidth = 64;
  const gap = 24;
  const height = 120;
  const totalWidth = times.length * barWidth + (times.length - 1) * gap;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height + 28}`}
      className="w-full max-w-xs"
      preserveAspectRatio="xMidYMid meet"
    >
      {times.map((t, i) => {
        const barH = Math.max(4, (t / max) * (height - 8));
        const x = i * (barWidth + gap);
        const y = height - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={4}
              fill="#3b82f6"
              opacity={0.8}
            />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fill="currentColor"
              fontSize={11}
              className="fill-muted-foreground"
            >
              {t}ms
            </text>
            <text
              x={x + barWidth / 2}
              y={height + 18}
              textAnchor="middle"
              fill="currentColor"
              fontSize={10}
              className="fill-muted-foreground"
            >
              Fetch {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */

export default function SpeedMonitor() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) router.push("/signin");
    });
  }, [router]);

  async function handleCheck(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/speed-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Speed check failed");
        setLoading(false);
        return;
      }

      setResult(data);

      // Add to local history
      setHistory((prev) => [data, ...prev].slice(0, 20));

      // Save to Supabase
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("speed_reports").insert({
            user_id: user.id,
            url: data.url,
            data: data,
          });
        }
      } catch {
        // Supabase save is best-effort
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  const r = result;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Site Speed &amp; Outage Monitor
        </h1>
        <p className="text-muted-foreground mt-1">
          Measure real response times, detect outages, and check server
          configuration for any URL.
        </p>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleCheck} className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter a URL to check (e.g. example.com)"
          required
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <ActivityIcon className="h-4 w-4 animate-pulse" />
              Checking...
            </>
          ) : (
            <>
              <GaugeIcon className="h-4 w-4" />
              Check Speed
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {r && (
        <>
          {/* ── Status Banner ────────────────────────────────────────── */}
          <div
            className={`rounded-lg border p-6 ${
              r.uptime.isUp
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Status dot + text */}
                <div className="flex items-center gap-2">
                  {r.uptime.isUp ? (
                    <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
                  ) : (
                    <XCircleIcon className="h-8 w-8 text-red-400" />
                  )}
                  <span
                    className={`text-3xl font-bold tracking-tight ${
                      r.uptime.isUp ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {r.uptime.isUp ? "UP" : "DOWN"}
                  </span>
                </div>

                {/* Grade badge */}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: gradeColor(r.grade) }}
                >
                  {r.grade}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-foreground truncate max-w-xs">
                  {r.url}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Checked {new Date(r.checkedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* ── Metrics Cards Row ────────────────────────────────────── */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Response Time */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ClockIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Avg Response Time
                </span>
              </div>
              <p
                className="text-3xl font-semibold font-mono"
                style={{ color: gradeColor(r.grade) }}
              >
                {r.timing.avgResponseTime ?? "—"}
                <span className="text-base text-muted-foreground ml-1">ms</span>
              </p>
            </div>

            {/* TTFB */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ActivityIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  TTFB
                </span>
              </div>
              <p className="text-3xl font-semibold font-mono">
                {r.timing.ttfb ?? "—"}
                <span className="text-base text-muted-foreground ml-1">ms</span>
              </p>
            </div>

            {/* Page Size */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <FileCodeIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Page Size
                </span>
              </div>
              <p className="text-3xl font-semibold font-mono">
                {r.size.htmlKB}
                <span className="text-base text-muted-foreground ml-1">KB</span>
              </p>
            </div>

            {/* Status Code */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ServerIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Status Code
                </span>
              </div>
              <p
                className="text-3xl font-semibold font-mono"
                style={{ color: statusCodeColor(r.status) }}
              >
                {r.status}
                <span className="text-base text-muted-foreground ml-1">
                  {r.statusText}
                </span>
              </p>
            </div>
          </div>

          {/* ── Performance Details ──────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Min / Max / Avg */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4">Response Time Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Min
                  </p>
                  <p className="text-xl font-semibold font-mono">
                    {r.timing.minResponseTime ?? "—"}
                    <span className="text-xs text-muted-foreground ml-0.5">
                      ms
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Avg
                  </p>
                  <p
                    className="text-xl font-semibold font-mono"
                    style={{ color: gradeColor(r.grade) }}
                  >
                    {r.timing.avgResponseTime ?? "—"}
                    <span className="text-xs text-muted-foreground ml-0.5">
                      ms
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Max
                  </p>
                  <p className="text-xl font-semibold font-mono">
                    {r.timing.maxResponseTime ?? "—"}
                    <span className="text-xs text-muted-foreground ml-0.5">
                      ms
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Server Info */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4">Server Info</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Server</dt>
                  <dd className="font-mono text-foreground">
                    {r.headers.server || "Not disclosed"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Content-Encoding</dt>
                  <dd className="font-mono text-foreground">
                    {r.headers.contentEncoding || "None"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cache-Control</dt>
                  <dd className="font-mono text-foreground truncate max-w-[200px]">
                    {r.headers.cacheControl || "Not set"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* SSL Status */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4" />
                SSL &amp; Connection
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">HTTPS</dt>
                  <dd>
                    {r.ssl.isHttps ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircleIcon className="h-3.5 w-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                        <XCircleIcon className="h-3.5 w-3.5" /> No
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Redirected</dt>
                  <dd>
                    {r.ssl.redirected ? (
                      <span className="inline-flex items-center gap-1 text-yellow-400 font-medium">
                        <ArrowRightIcon className="h-3.5 w-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-medium">
                        No
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Content-Type</dt>
                  <dd className="font-mono text-foreground truncate max-w-[200px]">
                    {r.headers.contentType || "Unknown"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Response Time Chart */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4">
                Individual Fetch Times
              </h3>
              <div className="flex items-center justify-center py-2">
                <FetchTimesChart times={r.fetchTimes} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── History ────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Check History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    URL
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Grade
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                    Avg Response
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Checked
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr
                    key={`${item.url}-${item.checkedAt}-${idx}`}
                    className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => setResult(item)}
                  >
                    <td className="py-3 pr-4 truncate max-w-[200px]">
                      {item.url}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: gradeColor(item.grade) }}
                      >
                        {item.grade}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {item.uptime.isUp ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          UP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
                          DOWN
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-muted-foreground">
                      {item.timing.avgResponseTime ?? "—"} ms
                    </td>
                    <td className="py-3 text-right text-xs text-muted-foreground">
                      {new Date(item.checkedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no results yet */}
      {!result && !loading && history.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-12">
          <div className="text-center">
            <GaugeIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Enter a URL above to check site speed and uptime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

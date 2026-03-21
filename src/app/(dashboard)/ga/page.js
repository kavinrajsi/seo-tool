"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  TrendingUpIcon,
  UsersIcon,
  EyeIcon,
  BarChart3Icon,
  LinkIcon,
} from "lucide-react";

const DATE_RANGES = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

/* ── Simple SVG bar chart ──────────────────────────────────────────── */
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
            key={d.date || i}
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

/* ── Simple SVG line chart ─────────────────────────────────────────── */
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
  const areaPoints = `0,${height} ${points} ${w},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

export default function Analytics() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [range, setRange] = useState(30);
  const [gaData, setGaData] = useState(null);
  const [scData, setScData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      let tokenQuery = supabase
        .from("google_tokens")
        .select("id");

      if (activeTeam) {
        tokenQuery = tokenQuery.eq("team_id", activeTeam.id);
      } else {
        tokenQuery = tokenQuery.eq("user_id", authData.user.id).is("team_id", null);
      }

      const { data: tokenRow } = await tokenQuery.single();

      setConnected(!!tokenRow);
    })();
  }, [activeTeam, activeProject]);

  useEffect(() => {
    if (connected) fetchData();
  }, [connected, range, activeTeam, activeProject]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/ga/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateRange: String(range) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGaData(data.gaData);
      setScData(data.scData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Not connected state ─────────────────────────────────────────── */
  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <BarChart3Icon size={40} className="text-muted-foreground" />
        <h2 className="text-lg font-bold">Connect Google Analytics</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Connect your Google account to view analytics data from Google Analytics and Search Console.
        </p>
        <a
          href="/api/google/auth"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          <LinkIcon size={16} />
          Connect Google
        </a>
      </div>
    );
  }

  const overview = gaData?.overview;
  const dailyTrend = gaData?.dailyTrend || [];

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Google Analytics &amp; Search Console data for your site.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading analytics…
        </div>
      )}

      {!loading && overview && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <EyeIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Page Views</span>
              </div>
              <p className="text-3xl font-semibold">{overview.pageViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Last {range} days</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <UsersIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Active Users</span>
              </div>
              <p className="text-3xl font-semibold">{overview.activeUsers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{overview.newUsers.toLocaleString()} new users</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUpIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Bounce Rate</span>
              </div>
              <p className="text-3xl font-semibold">{overview.bounceRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Avg session: {Math.round(overview.avgSessionDuration)}s</p>
            </div>
          </div>

          {/* Charts */}
          {dailyTrend.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-4">Page Views</h3>
                <BarChart data={dailyTrend} dataKey="pageViews" color="#3b82f6" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{dailyTrend[0]?.date}</span>
                  <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-4">Users</h3>
                <LineChart data={dailyTrend} dataKey="users" color="#22c55e" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{dailyTrend[0]?.date}</span>
                  <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
                <h3 className="text-sm font-medium mb-4">Sessions</h3>
                <LineChart data={dailyTrend} dataKey="sessions" color="#a855f7" height={100} />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{dailyTrend[0]?.date}</span>
                  <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top pages */}
          {gaData?.topPages?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4">Top Pages</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Page</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">Views</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">Users</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaData.topPages.map((page, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 font-mono text-xs">{page.path}</td>
                        <td className="py-3 pr-4 text-right font-mono text-muted-foreground">
                          {page.views.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-muted-foreground">
                          {page.users.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono text-muted-foreground">{Math.round(page.avgDuration)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Traffic sources */}
          {gaData?.trafficSources?.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-4">Traffic Sources</h3>
                <div className="space-y-2">
                  {gaData.trafficSources.map((src, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{src.channel}</span>
                      <span className="font-mono text-muted-foreground">{src.sessions.toLocaleString()} sessions</span>
                    </div>
                  ))}
                </div>
              </div>
              {gaData?.countries?.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-medium mb-4">Top Countries</h3>
                  <div className="space-y-2">
                    {gaData.countries.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{c.country}</span>
                        <span className="font-mono text-muted-foreground">{c.users.toLocaleString()} users</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!loading && !overview && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <BarChart3Icon size={32} />
          <p>No analytics data yet. Select a GA property in Settings to get started.</p>
        </div>
      )}
    </div>
  );
}

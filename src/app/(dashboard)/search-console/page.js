"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  SearchIcon,
  TrendingUpIcon,
  MousePointerClickIcon,
  EyeIcon,
  MonitorIcon,
  GlobeIcon,
  LinkIcon,
  BarChart3Icon,
} from "lucide-react";

const DATE_RANGES = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

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

export default function SearchConsole() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [range, setRange] = useState(30);
  const [scData, setScData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const { data: tokenRows } = await supabase
        .from("google_tokens")
        .select("id")
        .eq("user_id", authData.user.id)
        .limit(1);
      const isConnected = tokenRows?.length > 0;
      setConnected(isConnected);
      if (isConnected) {
        try {
          const res = await apiFetch("/api/ga/properties");
          const data = await res.json();
          if (res.ok) {
            setSites(data.sites || []);
            if (data.sites?.length) setSelectedSite(data.sites[0].url);
          }
        } catch {}
      }
    })();
  }, [activeTeam, activeProject]);

  useEffect(() => {
    if (connected && selectedSite) fetchData();
  }, [connected, range, selectedSite]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/ga/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRange: String(range),
          siteUrl: selectedSite,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScData(data.scData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <SearchIcon size={40} className="text-muted-foreground" />
        <h2 className="text-lg font-bold">Connect Google</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Connect your Google account to view Search Console data.
        </p>
        <a href="/api/google/auth" className="inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors">
          <LinkIcon size={16} /> Connect Google
        </a>
      </div>
    );
  }

  const totalClicks = scData?.searchTrend?.reduce((sum, d) => sum + d.clicks, 0) || 0;
  const totalImpressions = scData?.searchTrend?.reduce((sum, d) => sum + d.impressions, 0) || 0;
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
  const avgPosition = scData?.searchTrend?.length
    ? (scData.searchTrend.reduce((sum, d) => sum + d.position, 0) / scData.searchTrend.length).toFixed(1)
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search Console</h1>
        <p className="text-muted-foreground mt-1">Google Search performance data for your site.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {sites.length > 0 && (
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none"
          >
            {sites.map((s) => (
              <option key={s.url} value={s.url}>{s.url}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading search data…</div>
      )}

      {!loading && scData && (
        <>
          {/* Summary */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MousePointerClickIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Clicks</span>
              </div>
              <p className="text-3xl font-semibold">{totalClicks.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <EyeIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Impressions</span>
              </div>
              <p className="text-3xl font-semibold">{totalImpressions.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUpIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Avg CTR</span>
              </div>
              <p className="text-3xl font-semibold">{avgCtr}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <BarChart3Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Avg Position</span>
              </div>
              <p className="text-3xl font-semibold">{avgPosition}</p>
            </div>
          </div>

          {/* Clicks & Impressions Trend */}
          {scData.searchTrend?.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-3">Clicks Trend</h3>
                <LineChart data={scData.searchTrend} dataKey="clicks" color="#3b82f6" />
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-3">Impressions Trend</h3>
                <LineChart data={scData.searchTrend} dataKey="impressions" color="#a855f7" />
              </div>
            </div>
          )}

          {/* Top Queries */}
          {scData.topQueries?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4">Top Queries</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Query</th>
                      <th className="pb-2 pr-4 font-medium text-right">Clicks</th>
                      <th className="pb-2 pr-4 font-medium text-right">Impressions</th>
                      <th className="pb-2 pr-4 font-medium text-right">CTR</th>
                      <th className="pb-2 font-medium text-right">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scData.topQueries.map((q, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4">{q.query}</td>
                        <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{q.clicks.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{q.impressions.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{q.ctr}%</td>
                        <td className="py-2 text-right font-mono text-muted-foreground">{q.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Pages */}
          {scData.searchPages?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4">Top Pages</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Page</th>
                      <th className="pb-2 pr-4 font-medium text-right">Clicks</th>
                      <th className="pb-2 pr-4 font-medium text-right">Impressions</th>
                      <th className="pb-2 pr-4 font-medium text-right">CTR</th>
                      <th className="pb-2 font-medium text-right">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scData.searchPages.map((p, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs max-w-[300px] truncate">{p.page}</td>
                        <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{p.clicks.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{p.impressions.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{p.ctr}%</td>
                        <td className="py-2 text-right font-mono text-muted-foreground">{p.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Devices & Countries */}
          <div className="grid gap-4 lg:grid-cols-2">
            {scData.searchDevices?.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <MonitorIcon className="h-4 w-4 text-muted-foreground" /> Devices
                </h3>
                <div className="space-y-2">
                  {scData.searchDevices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{d.device}</span>
                      <div className="flex items-center gap-4 text-muted-foreground font-mono text-xs">
                        <span>{d.clicks.toLocaleString()} clicks</span>
                        <span>{d.impressions.toLocaleString()} imp</span>
                        <span>{d.position} pos</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {scData.searchCountries?.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <GlobeIcon className="h-4 w-4 text-muted-foreground" /> Countries
                </h3>
                <div className="space-y-2">
                  {scData.searchCountries.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{c.country}</span>
                      <div className="flex items-center gap-4 text-muted-foreground font-mono text-xs">
                        <span>{c.clicks.toLocaleString()} clicks</span>
                        <span>{c.impressions.toLocaleString()} imp</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !scData && !error && selectedSite && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <SearchIcon size={32} />
          <p>No search data available for this site.</p>
        </div>
      )}
    </div>
  );
}

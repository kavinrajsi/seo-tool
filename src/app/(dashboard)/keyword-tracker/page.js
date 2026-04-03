"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logError } from "@/lib/logger";
import { apiFetch } from "@/lib/api";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  SearchIcon,
  MousePointerClickIcon,
  EyeIcon,
  CrosshairIcon,
} from "lucide-react";

/* ── SVG line chart (reuses ga/page.js pattern) ─────────────────────── */
function LineChart({ data, dataKey, color, height = 120 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  const min = Math.min(...data.map((d) => d[dataKey]));
  const range = max - min || 1;
  const w = 500;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      // For position, lower is better — invert the y axis
      const y =
        dataKey === "position"
          ? 8 + ((d[dataKey] - min) / range) * (height - 16)
          : height - 8 - ((d[dataKey] - min) / range) * (height - 16);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints =
    dataKey === "position"
      ? `0,0 ${points} ${w},0`
      : `0,${height} ${points} ${w},${height}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
    >
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

/* ── Sparkline for table rows ───────────────────────────────────────── */
function Sparkline({ data, dataKey, color, width = 100, height = 28 }) {
  if (data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  const min = Math.min(...data.map((d) => d[dataKey]));
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y =
        dataKey === "position"
          ? 2 + ((d[dataKey] - min) / range) * (height - 4)
          : height - 2 - ((d[dataKey] - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

/* ── Trend indicator ────────────────────────────────────────────────── */
function TrendBadge({ current, previous, invert = false }) {
  if (previous == null || previous === 0)
    return (
      <span className="text-muted-foreground text-xs flex items-center gap-0.5">
        <MinusIcon className="h-3 w-3" /> N/A
      </span>
    );
  const diff = current - previous;
  // For position: negative diff = improved (moved up) = good
  const improved = invert ? diff < 0 : diff > 0;
  const worsened = invert ? diff > 0 : diff < 0;
  if (diff === 0)
    return (
      <span className="text-muted-foreground text-xs flex items-center gap-0.5">
        <MinusIcon className="h-3 w-3" /> No change
      </span>
    );
  return (
    <span
      className={`text-xs flex items-center gap-0.5 ${
        improved ? "text-green-500" : worsened ? "text-red-500" : "text-muted-foreground"
      }`}
    >
      {improved ? (
        <TrendingUpIcon className="h-3 w-3" />
      ) : (
        <TrendingDownIcon className="h-3 w-3" />
      )}
      {invert ? (diff > 0 ? "+" : "") : diff > 0 ? "+" : ""}
      {diff.toFixed(1)}
    </span>
  );
}

const DATE_RANGES = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export default function KeywordTracker() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [range, setRange] = useState(30);
  const [keywords, setKeywords] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [error, setError] = useState("");


  // Load Search Console sites
  useEffect(() => {
    async function loadSites() {
      try {
        const res = await apiFetch("/api/ga/properties");
        const data = await res.json();
        if (data.sites && data.sites.length > 0) {
          setSites(data.sites);
          setSelectedSite(data.sites[0].url);
        }
      } catch (err) {
        logError("keyword-tracker/load-sites", err);
      }
    }
    loadSites();
  }, []);

  // Fetch rankings when site or range changes
  const fetchRankings = useCallback(async () => {
    if (!selectedSite) return;
    setLoading(true);
    setError("");
    try {
      const teamParam = "";
      const res = await apiFetch(
        `/api/keywords/track?siteUrl=${encodeURIComponent(selectedSite)}&days=${range}${teamParam}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeywords(data.keywords || []);
      setRankings(data.rankings || []);
      if (data.keywords?.length > 0 && !selectedKeyword) {
        setSelectedKeyword(data.keywords[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSite, range, selectedKeyword]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // Add keyword
  async function handleAdd() {
    if (!newKeyword.trim() || !selectedSite) return;
    setAdding(true);
    setError("");
    try {
      const res = await apiFetch("/api/keywords/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newKeyword.trim(),
          siteUrl: selectedSite,
          teamId: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewKeyword("");
      await fetchRankings();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  // Delete keyword
  async function handleDelete(keyword) {
    try {
      const res = await apiFetch("/api/keywords/track", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, siteUrl: selectedSite, teamId: null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setKeywords((prev) => prev.filter((k) => k !== keyword));
      setRankings((prev) => prev.filter((r) => r.keyword !== keyword));
      if (selectedKeyword === keyword) {
        setSelectedKeyword(keywords.find((k) => k !== keyword) || null);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // Refresh data
  async function handleRefresh() {
    setRefreshing(true);
    await fetchRankings();
    setRefreshing(false);
  }

  // Compute per-keyword summaries
  function getKeywordSummary(keyword) {
    const data = rankings
      .filter((r) => r.keyword === keyword)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (data.length === 0)
      return { position: 0, impressions: 0, clicks: 0, prevPosition: null, data: [] };
    const latest = data[data.length - 1];
    const prev = data.length >= 2 ? data[data.length - 2] : null;
    return {
      position: latest.position,
      impressions: data.reduce((s, d) => s + d.impressions, 0),
      clicks: data.reduce((s, d) => s + d.clicks, 0),
      prevPosition: prev?.position ?? null,
      data,
    };
  }

  // Selected keyword detail data
  const selectedData = selectedKeyword
    ? rankings
        .filter((r) => r.keyword === selectedKeyword)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const totalImpressions = rankings.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = rankings.reduce((s, r) => s + r.clicks, 0);
  const avgPosition =
    keywords.length > 0
      ? +(
          keywords.reduce((s, k) => s + getKeywordSummary(k).position, 0) /
          keywords.length
        ).toFixed(1)
      : 0;

  // ── No Google connection state ──
  if (sites.length === 0 && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <SearchIcon className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Connect Google Search Console</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Link your Google account in the Analytics page to start tracking keyword
          rankings from Search Console data.
        </p>
        <button
          onClick={() => router.push("/ga")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Analytics
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Keyword Rank Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track keyword positions over time using Search Console data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Site selector */}
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
          >
            {sites.map((s) => (
              <option key={s.url} value={s.url}>
                {s.url}
              </option>
            ))}
          </select>

          {/* Date range */}
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

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-md border border-border bg-card p-2 hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <SearchIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Tracked Keywords
            </span>
          </div>
          <p className="text-3xl font-semibold">{keywords.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CrosshairIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Avg Position
            </span>
          </div>
          <p className="text-3xl font-semibold">{avgPosition}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <EyeIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Impressions
            </span>
          </div>
          <p className="text-3xl font-semibold">
            {totalImpressions.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MousePointerClickIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Clicks
            </span>
          </div>
          <p className="text-3xl font-semibold">
            {totalClicks.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Add keyword */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter a keyword to track..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newKeyword.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          {adding ? "Adding..." : "Add Keyword"}
        </button>
      </div>

      {loading && keywords.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCwIcon className="h-5 w-5 animate-spin mr-2" />
          Loading ranking data...
        </div>
      ) : keywords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <SearchIcon className="h-10 w-10" />
          <p>No keywords tracked yet. Add your first keyword above.</p>
        </div>
      ) : (
        <>
          {/* Keywords table */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4">Tracked Keywords</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Keyword
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Position
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Trend
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      History
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Impressions
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Clicks
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => {
                    const summary = getKeywordSummary(kw);
                    return (
                      <tr
                        key={kw}
                        onClick={() => setSelectedKeyword(kw)}
                        className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors ${
                          selectedKeyword === kw
                            ? "bg-accent/50"
                            : "hover:bg-accent/30"
                        }`}
                      >
                        <td className="py-3 pr-4 font-medium">{kw}</td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {summary.position > 0
                            ? summary.position.toFixed(1)
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <TrendBadge
                            current={summary.position}
                            previous={summary.prevPosition}
                            invert
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <Sparkline
                            data={summary.data}
                            dataKey="position"
                            color="#3b82f6"
                          />
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-muted-foreground">
                          {summary.impressions.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-muted-foreground">
                          {summary.clicks.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(kw);
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail charts for selected keyword */}
          {selectedKeyword && selectedData.length >= 2 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-1">
                  Position History —{" "}
                  <span className="text-primary">{selectedKeyword}</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Lower is better. Position 1 = top of search results.
                </p>
                <LineChart
                  data={selectedData}
                  dataKey="position"
                  color="#3b82f6"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{selectedData[0]?.date}</span>
                  <span>{selectedData[selectedData.length - 1]?.date}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-1">
                  Clicks —{" "}
                  <span className="text-primary">{selectedKeyword}</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Daily clicks from search results.
                </p>
                <LineChart
                  data={selectedData}
                  dataKey="clicks"
                  color="#22c55e"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{selectedData[0]?.date}</span>
                  <span>{selectedData[selectedData.length - 1]?.date}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
                <h3 className="text-sm font-medium mb-1">
                  Impressions —{" "}
                  <span className="text-primary">{selectedKeyword}</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  How often your site appeared in search results for this keyword.
                </p>
                <LineChart
                  data={selectedData}
                  dataKey="impressions"
                  color="#a855f7"
                  height={100}
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{selectedData[0]?.date}</span>
                  <span>{selectedData[selectedData.length - 1]?.date}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import { logError } from "@/lib/logger";
import {
  LinkIcon,
  ShieldAlertIcon,
  TrendingUpIcon,
  ExternalLinkIcon,
  GlobeIcon,
  AnchorIcon,
  SearchIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
const TABS = [
  { key: "all", label: "All Backlinks" },
  { key: "domains", label: "Referring Domains" },
  { key: "anchors", label: "Anchor Texts" },
  { key: "toxic", label: "Toxic Links" },
];

// ---------------------------------------------------------------------------
// SVG bar chart — new vs lost links over 30 days
// ---------------------------------------------------------------------------
function TrendBarChart({ data, height = 140 }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => Math.max(d.newLinks, d.lostLinks)), 1);
  const barWidth = Math.max(4, Math.min(12, Math.floor(600 / data.length) - 4));
  const pairWidth = barWidth * 2 + 2;
  const w = data.length * (pairWidth + 2);

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const newH = (d.newLinks / maxVal) * (height - 8);
          const lostH = (d.lostLinks / maxVal) * (height - 8);
          const x = i * (pairWidth + 2);
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={height - newH}
                width={barWidth}
                height={newH}
                rx={2}
                fill="#22c55e"
                opacity={0.85}
              />
              <rect
                x={x + barWidth + 2}
                y={height - lostH}
                width={barWidth}
                height={lostH}
                rx={2}
                fill="#ef4444"
                opacity={0.85}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          New links
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          Lost links
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quality badge
// ---------------------------------------------------------------------------
function QualityBadge({ quality }) {
  const styles = {
    good: "bg-emerald-900/60 text-emerald-300",
    warning: "bg-yellow-900/60 text-yellow-300",
    toxic: "bg-red-900/60 text-red-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[quality] || styles.warning}`}
    >
      {quality}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Type badge (follow / nofollow)
// ---------------------------------------------------------------------------
function TypeBadge({ type }) {
  const isFollow = type === "follow";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isFollow
          ? "bg-blue-900/60 text-blue-300"
          : "bg-zinc-700/60 text-zinc-300"
      }`}
    >
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Authority indicator with color
// ---------------------------------------------------------------------------
function AuthorityScore({ value }) {
  let colorClass = "text-red-400";
  if (value >= 60) colorClass = "text-emerald-400";
  else if (value >= 30) colorClass = "text-yellow-400";

  return <span className={`font-mono font-medium ${colorClass}`}>{value}</span>;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function BacklinksChecker() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [domain, setDomain] = useState("");

  useEffect(() => {
    if (activeProject?.domain) {
      const domain = activeProject.domain.replace(/^https?:\/\//, "");
      setDomain(domain);

      // Load latest existing backlink report for this domain
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existing } = await supabase
          .from("backlink_reports")
          .select("data")
          .ilike("domain", `%${domain}%`)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existing?.length > 0 && existing[0].data) {
          setData(existing[0].data);
        }
      })();
    }
  }, [activeProject]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  async function handleCheck(e) {
    e.preventDefault();
    if (!domain.trim()) return;

    setError("");
    setLoading(true);
    setData(null);
    setActiveTab("all");

    try {
      const res = await apiFetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Backlink check failed.");
        setLoading(false);
        return;
      }

      setData(json);

      // Save to Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("backlink_reports").insert({
          user_id: user.id,
          team_id: activeTeam?.id || null,
          domain: json.domain,
          data: json,
        });
      }
    } catch (err) {
      logError("backlinks/check", err);
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  const summary = data?.summary;
  const netNew =
    summary != null ? summary.newLast30Days - summary.lostLast30Days : 0;

  // Quality distribution
  const qualityCounts = data
    ? {
        good: data.backlinks.filter((b) => b.quality === "good").length,
        warning: data.backlinks.filter((b) => b.quality === "warning").length,
        toxic: data.backlinks.filter((b) => b.quality === "toxic").length,
      }
    : null;

  const totalForPct = qualityCounts
    ? qualityCounts.good + qualityCounts.warning + qualityCounts.toxic || 1
    : 1;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Backlinks Checker
        </h1>
        <p className="text-muted-foreground mt-1">
          Analyze your backlink profile, find toxic links, and monitor link
          growth.
        </p>
      </div>

      {/* Domain input */}
      <form onSubmit={handleCheck} className="flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter a domain to check (e.g. example.com)"
            required
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check Backlinks"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Analyzing backlinks for <span className="font-medium text-foreground">{domain}</span>...
        </div>
      )}

      {data && (
        <>
          {data.isDemo && (
            <div className="rounded-md border border-yellow-800 bg-yellow-950/50 px-4 py-3 text-sm text-yellow-300 flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 shrink-0" />
              <span>
                <strong>Demo Data</strong> — These results are simulated. Connect Google in Analytics settings for real data.
              </span>
            </div>
          )}
          {data.source && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 shrink-0" />
              <span>Data from <strong>{data.source}</strong></span>
            </div>
          )}
          {/* ── Summary Cards ────────────────────────────────────────── */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Backlinks */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <LinkIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Total Backlinks
                </span>
              </div>
              <p className="text-3xl font-semibold font-mono">
                {summary.totalBacklinks.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.followRatio}% follow
              </p>
            </div>

            {/* Referring Domains */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <GlobeIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Referring Domains
                </span>
              </div>
              <p className="text-3xl font-semibold font-mono">
                {summary.referringDomains.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Unique sources
              </p>
            </div>

            {/* Domain Authority */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ShieldAlertIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Domain Authority
                </span>
              </div>
              <p
                className={`text-3xl font-semibold font-mono ${
                  summary.domainAuthority >= 60
                    ? "text-emerald-400"
                    : summary.domainAuthority >= 30
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {summary.domainAuthority}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Authority score
              </p>
            </div>

            {/* New Links (30d) */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUpIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  New Links (30d)
                </span>
              </div>
              <p className="text-3xl font-semibold font-mono">
                {summary.newLast30Days}
              </p>
              <p className="text-xs mt-1">
                <span
                  className={
                    netNew >= 0 ? "text-emerald-400" : "text-red-400"
                  }
                >
                  {netNew >= 0 ? "+" : ""}
                  {netNew} net
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  ({summary.lostLast30Days} lost)
                </span>
              </p>
            </div>
          </div>

          {/* ── Link Quality Distribution ────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-3">
              Link Quality Distribution
            </h3>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {qualityCounts.good > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{
                    width: `${(qualityCounts.good / totalForPct) * 100}%`,
                  }}
                />
              )}
              {qualityCounts.warning > 0 && (
                <div
                  className="bg-yellow-500 transition-all"
                  style={{
                    width: `${(qualityCounts.warning / totalForPct) * 100}%`,
                  }}
                />
              )}
              {qualityCounts.toxic > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{
                    width: `${(qualityCounts.toxic / totalForPct) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Good: {qualityCounts.good} (
                {Math.round((qualityCounts.good / totalForPct) * 100)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
                Warning: {qualityCounts.warning} (
                {Math.round((qualityCounts.warning / totalForPct) * 100)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                Toxic: {qualityCounts.toxic} (
                {Math.round((qualityCounts.toxic / totalForPct) * 100)}%)
              </span>
            </div>
          </div>

          {/* ── New Links Trend ──────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4">
              New vs Lost Links (Last 30 Days)
            </h3>
            <TrendBarChart data={data.trend} />
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5 self-start">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.key === "toxic" && data.toxicLinks.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-900/60 px-1.5 text-[10px] text-red-300">
                    {data.toxicLinks.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── All Backlinks Tab ─────────────────────────────────────── */}
          {activeTab === "all" && (
            <div className="rounded-lg border border-border bg-card p-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Source URL
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Anchor Text
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Authority
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Quality
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      First Seen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.backlinks.map((link, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 pr-4 max-w-[260px]">
                        <a
                          href={link.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 truncate"
                        >
                          <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{link.sourceUrl}</span>
                        </a>
                        <span className="text-xs text-muted-foreground">
                          {link.sourceDomain}
                        </span>
                      </td>
                      <td className="py-3 pr-4 max-w-[180px] truncate">
                        {link.anchorText}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <AuthorityScore value={link.authority} />
                      </td>
                      <td className="py-3 pr-4">
                        <TypeBadge type={link.type} />
                      </td>
                      <td className="py-3 pr-4">
                        <QualityBadge quality={link.quality} />
                      </td>
                      <td className="py-3 text-muted-foreground font-mono text-xs">
                        {link.firstSeen}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Referring Domains Tab ─────────────────────────────────── */}
          {activeTab === "domains" && (
            <div className="rounded-lg border border-border bg-card p-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Domain
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Authority
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Backlinks
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.referringDomains.map((rd, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <a
                          href={`https://${rd.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300"
                        >
                          <GlobeIcon className="h-3 w-3 flex-shrink-0" />
                          {rd.domain}
                        </a>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <AuthorityScore value={rd.authority} />
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-muted-foreground">
                        {rd.backlinks}
                      </td>
                      <td className="py-3">
                        <TypeBadge type={rd.type} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Anchor Texts Tab ─────────────────────────────────────── */}
          {activeTab === "anchors" && (
            <div className="rounded-lg border border-border bg-card p-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Anchor Text
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Count
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.anchorTexts.map((anchor, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1.5">
                          <AnchorIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          {anchor.text}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-muted-foreground">
                        {anchor.count}
                      </td>
                      <td className="py-3 w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${anchor.percentage}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground w-10 text-right">
                            {anchor.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Toxic Links Tab ──────────────────────────────────────── */}
          {activeTab === "toxic" && (
            <div className="rounded-lg border border-red-900/40 bg-card p-5 overflow-x-auto">
              {data.toxicLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShieldAlertIcon className="h-10 w-10 text-emerald-500/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No toxic links found. Your backlink profile looks clean.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangleIcon className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-red-300">
                      {data.toxicLinks.length} toxic link
                      {data.toxicLinks.length !== 1 ? "s" : ""} detected
                    </span>
                    <span className="text-xs text-muted-foreground">
                      — consider disavowing these in Google Search Console
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-red-900/40 text-left">
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">
                          Source URL
                        </th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">
                          Anchor Text
                        </th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                          Authority
                        </th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground">
                          First Seen
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.toxicLinks.map((link, i) => (
                        <tr
                          key={i}
                          className="border-b border-red-900/30 last:border-0 bg-red-950/20"
                        >
                          <td className="py-3 pr-4 max-w-[260px]">
                            <a
                              href={link.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 truncate"
                            >
                              <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {link.sourceUrl}
                              </span>
                            </a>
                            <span className="text-xs text-muted-foreground">
                              {link.sourceDomain}
                            </span>
                          </td>
                          <td className="py-3 pr-4 max-w-[180px] truncate">
                            {link.anchorText}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <AuthorityScore value={link.authority} />
                          </td>
                          <td className="py-3 pr-4">
                            <TypeBadge type={link.type} />
                          </td>
                          <td className="py-3 text-muted-foreground font-mono text-xs">
                            {link.firstSeen}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-12">
          <div className="text-center">
            <LinkIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Enter a domain above to analyze its backlink profile.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

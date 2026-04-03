"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProject } from "@/lib/project-context";
import { logError } from "@/lib/logger";
import {
  GlobeIcon,
  SearchIcon,
  AlertTriangleIcon,
  MapIcon,
  LinkIcon,
  FileTextIcon,
  LanguagesIcon,
  ZapIcon,
  RefreshCwIcon,
} from "lucide-react";

function BarChart({ rows, maxVal }) {
  const max = maxVal || Math.max(...rows.map((r) => r.value), 1);
  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
    gray: "bg-gray-500",
    teal: "bg-teal-500",
    orange: "bg-orange-500",
  };
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-36 shrink-0 truncate">
            {row.label}
          </span>
          <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colors[row.color] || "bg-blue-500"}`}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground w-8 text-right">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function pct(value, total) {
  if (!total) return "0%";
  return Math.round((value / total) * 100) + "%";
}

function StatTile({ icon: Icon, title, mainStats, subStats }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </h3>
      <div className="flex gap-6">
        {mainStats.map((m, i) => (
          <div key={i}>
            <div className="text-2xl font-semibold font-mono">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
          </div>
        ))}
      </div>
      {subStats && subStats.length > 0 && (
        <>
          <div className="border-t border-border my-3" />
          <div className="flex flex-col gap-1.5">
            {subStats.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span>{s.label}:</span>
                <span className="font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TileView({ data }) {
  const total = data.total_pages || 1;
  const pagesWithAnalysis =
    data.total_pages - (data.status_codes.timeout || 0);

  // HTTP Status Code
  const errorPct = pct(
    data.status_codes.client_error + data.status_codes.server_error,
    total
  );

  // Crawl Depth: pages with more than 3 clicks
  const depthEntries = Object.entries(data.crawl_depth);
  const deepPages = depthEntries
    .filter(([d]) => Number(d) > 3)
    .reduce((sum, [, count]) => sum + count, 0);

  // Incoming Internal Links: pages with only 1 incoming link
  const oneLink = data.incoming_links.one_to_three || 0;
  const orphan = data.incoming_links.zero || 0;
  const singleLinkPct = pct(oneLink + orphan, total);

  // Markup: pages with no markup
  const noMarkupCount =
    pagesWithAnalysis -
    Math.max(
      data.markup.schemaOrg_microdata,
      data.markup.schemaOrg_jsonld,
      data.markup.openGraph,
      data.markup.twitterCards,
      data.markup.microformats
    );
  const noMarkupPct = pct(Math.max(0, noMarkupCount), total);

  // Hreflang
  const hreflangOk = data.hreflang.valid || 0;

  return (
    <div className="mt-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={GlobeIcon}
          title="HTTP Status Code"
          mainStats={[
            { value: errorPct, label: "pages with 4xx and 5xx status codes" },
          ]}
          subStats={[
            {
              label: "5xx",
              value: pct(data.status_codes.server_error, total),
            },
            {
              label: "4xx",
              value: pct(data.status_codes.client_error, total),
            },
            { label: "3xx", value: pct(data.status_codes.redirect, total) },
            { label: "2xx", value: pct(data.status_codes.ok, total) },
            { label: "1xx", value: "0%" },
            {
              label: "No code",
              value: pct(data.status_codes.timeout, total),
            },
          ]}
        />

        <StatTile
          icon={MapIcon}
          title="Sitemap vs. Crawled Pages"
          mainStats={[
            { value: String(data.sitemap_total), label: "pages in sitemap" },
          ]}
          subStats={[
            {
              label: "Crawled pages found in sitemap",
              value: pct(data.sitemap.in_sitemap, total),
            },
            {
              label: "Crawled pages not found in sitemap",
              value: pct(data.sitemap.not_in_sitemap, total),
            },
          ]}
        />

        <StatTile
          icon={SearchIcon}
          title="Pages Crawl Depth"
          mainStats={[
            {
              value: pct(deepPages, total),
              label: "pages with more than 3 clicks",
            },
          ]}
          subStats={depthEntries
            .sort(([a], [b]) => Number(a) - Number(b))
            .filter(([d]) => Number(d) >= 1)
            .map(([depth, count]) => ({
              label: `${depth} click${depth === "1" ? "" : "s"}`,
              value: pct(count, total),
            }))}
        />

        <StatTile
          icon={LinkIcon}
          title="Incoming Internal Links"
          mainStats={[
            {
              value: singleLinkPct,
              label: "pages have only 1 incoming internal link",
            },
          ]}
          subStats={[
            {
              label: "2-5",
              value: pct(data.incoming_links.one_to_three, total),
            },
            {
              label: "6-15",
              value: pct(data.incoming_links.four_to_ten, total),
            },
            {
              label: "16-50",
              value: pct(data.incoming_links.over_ten, total),
            },
            { label: "51-150", value: "0%" },
            { label: "151-500", value: "0%" },
            { label: "500+", value: "0%" },
          ]}
        />

        <StatTile
          icon={FileTextIcon}
          title="Markup Types"
          mainStats={[
            { value: noMarkupPct, label: "pages have no markup" },
          ]}
          subStats={[
            {
              label: "Schema.org (Microdata)",
              value: pct(data.markup.schemaOrg_microdata, total),
            },
            {
              label: "Schema.org (JSON-LD)",
              value: pct(data.markup.schemaOrg_jsonld, total),
            },
            {
              label: "Open Graph",
              value: pct(data.markup.openGraph, total),
            },
            {
              label: "Twitter Cards",
              value: pct(data.markup.twitterCards, total),
            },
            {
              label: "Microformats",
              value: pct(data.markup.microformats, total),
            },
          ]}
        />

        <StatTile
          icon={AlertTriangleIcon}
          title="Canonicalization"
          mainStats={[
            {
              value: pct(data.canonical.noCanonical, total),
              label: 'pages without rel="canonical" tag',
            },
          ]}
          subStats={[
            {
              label: "Canonical to another page",
              value: pct(data.canonical.canonicalToOther, total),
            },
            {
              label: "Self-canonical",
              value: pct(data.canonical.selfCanonical, total),
            },
          ]}
        />

        <StatTile
          icon={LanguagesIcon}
          title="Hreflang Usage"
          mainStats={[
            {
              value: pct(hreflangOk, total),
              label: "pages without issues",
            },
          ]}
          subStats={[
            {
              label: "With issues",
              value: pct(data.hreflang.withIssues, total),
            },
          ]}
        />

        <StatTile
          icon={ZapIcon}
          title="AMP Links"
          mainStats={[
            {
              value: pct(data.amp.withoutAmp, total),
              label: "pages have no AMP link",
            },
            {
              value: pct(data.amp.withAmp, total),
              label: "pages have AMP link",
            },
          ]}
          subStats={[]}
        />
      </div>
    </div>
  );
}

export default function SeoStatistics() {
  const { activeProject } = useProject();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (activeProject?.domain) {
      const domain = activeProject.domain.replace(/^https?:\/\//, "");
      setUrl(domain);

      // Load latest existing crawl report for this domain
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existing } = await supabase
          .from("crawl_reports")
          .select("data")
          .or(`url.eq.${activeProject.domain},url.eq.https://${domain},url.eq.http://${domain}`)
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
  const [view, setView] = useState("tile");

  async function handleCrawl(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setLoading(true);
    setData(null);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Crawl failed");
        setLoading(false);
        return;
      }

      setData(json);

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("crawl_reports").insert({
          user_id: user.id,
          team_id: null,
          url: url.trim(),
          data: json,
        });
      }
    } catch (err) {
      logError("seo-statistics/crawl", err);
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  const totalPages = data?.total_pages || 0;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Site Crawler
          </h1>
          <p className="text-muted-foreground mt-1">
            Crawl your site to discover pages, analyze structure, and find SEO issues.
          </p>
        </div>

        {/* URL Input */}
        <form onSubmit={handleCrawl} className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter site URL to crawl (e.g. example.com)"
            required
            className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
                Crawling...
              </>
            ) : (
              <>
                <SearchIcon className="h-4 w-4" />
                Crawl Site
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <RefreshCwIcon className="h-5 w-5 animate-spin" />
            Crawling pages... this may take a moment
          </div>
        )}

        {data && (
          <>
            {/* Summary */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-8">
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-3xl font-semibold font-mono">
                  {data.total_pages}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                  Pages Crawled
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-3xl font-semibold font-mono">
                  {data.sitemap_total}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                  Sitemap URLs
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-3xl font-semibold font-mono">
                  {data.status_codes.client_error +
                    data.status_codes.server_error}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                  Error Pages
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-3xl font-semibold font-mono">
                  {data.canonical.noCanonical}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                  No Canonical
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5 mt-6 w-fit">
              <button
                className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "tile"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setView("tile")}
              >
                &#9638; Tile
              </button>
              <button
                className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "graph"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setView("graph")}
              >
                &#9636; Graph
              </button>
            </div>

            {view === "tile" ? (
              <TileView data={data} />
            ) : (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-6">
                {/* HTTP Status Codes */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    HTTP Status Codes
                    {data.error_pages.length > 0 && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-950/50 text-red-400">
                        {data.error_pages.length} errors
                      </span>
                    )}
                  </h3>
                  <BarChart
                    maxVal={totalPages}
                    rows={[
                      {
                        label: "2xx Success",
                        value: data.status_codes.ok,
                        color: "green",
                      },
                      {
                        label: "3xx Redirect",
                        value: data.status_codes.redirect,
                        color: "yellow",
                      },
                      {
                        label: "4xx Client Error",
                        value: data.status_codes.client_error,
                        color: "red",
                      },
                      {
                        label: "5xx Server Error",
                        value: data.status_codes.server_error,
                        color: "red",
                      },
                      {
                        label: "Timeout / Failed",
                        value: data.status_codes.timeout,
                        color: "gray",
                      },
                    ]}
                  />
                  {data.error_pages.length > 0 && (
                    <div className="mt-3">
                      {data.error_pages.map((p) => (
                        <div
                          key={p.url}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                        >
                          <span className="text-sm truncate mr-4">
                            {p.url}
                          </span>
                          <span className="text-xs font-mono text-red-400 shrink-0">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sitemap vs Crawled */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Sitemap vs. Crawled Pages
                  </h3>
                  <BarChart
                    rows={[
                      {
                        label: "In sitemap",
                        value: data.sitemap.in_sitemap,
                        color: "green",
                      },
                      {
                        label: "Not in sitemap",
                        value: data.sitemap.not_in_sitemap,
                        color: "yellow",
                      },
                      {
                        label: "Sitemap only",
                        value: data.sitemap.sitemap_not_crawled,
                        color: "gray",
                      },
                    ]}
                  />
                </div>

                {/* Crawl Depth */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Pages Crawl Depth
                  </h3>
                  <BarChart
                    maxVal={totalPages}
                    rows={Object.entries(data.crawl_depth)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([depth, count]) => ({
                        label:
                          depth === "0"
                            ? "Homepage"
                            : `${depth} click${depth === "1" ? "" : "s"}`,
                        value: count,
                        color:
                          Number(depth) <= 1
                            ? "green"
                            : Number(depth) <= 3
                              ? "blue"
                              : "yellow",
                      }))}
                  />
                </div>

                {/* Incoming Internal Links */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    Incoming Internal Links
                    {data.incoming_links.zero > 0 && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-950/50 text-red-400">
                        {data.incoming_links.zero} orphan
                      </span>
                    )}
                  </h3>
                  <BarChart
                    maxVal={totalPages}
                    rows={[
                      {
                        label: "0 links (orphan)",
                        value: data.incoming_links.zero,
                        color: "red",
                      },
                      {
                        label: "1-3 links",
                        value: data.incoming_links.one_to_three,
                        color: "yellow",
                      },
                      {
                        label: "4-10 links",
                        value: data.incoming_links.four_to_ten,
                        color: "green",
                      },
                      {
                        label: "10+ links",
                        value: data.incoming_links.over_ten,
                        color: "green",
                      },
                    ]}
                  />
                  {data.low_link_pages.length > 0 && (
                    <div className="mt-3">
                      {data.low_link_pages.slice(0, 5).map((p) => (
                        <div
                          key={p.url}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                        >
                          <span className="text-sm truncate mr-4">
                            {p.url}
                          </span>
                          <span
                            className={`text-xs font-mono shrink-0 ${
                              p.count === 0
                                ? "text-red-400"
                                : "text-yellow-400"
                            }`}
                          >
                            {p.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Markup Types */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Markup Types
                  </h3>
                  <BarChart
                    maxVal={totalPages}
                    rows={[
                      {
                        label: "Schema.org (Microdata)",
                        value: data.markup.schemaOrg_microdata,
                        color: "purple",
                      },
                      {
                        label: "Schema.org (JSON-LD)",
                        value: data.markup.schemaOrg_jsonld,
                        color: "purple",
                      },
                      {
                        label: "Open Graph",
                        value: data.markup.openGraph,
                        color: "blue",
                      },
                      {
                        label: "Twitter Cards",
                        value: data.markup.twitterCards,
                        color: "cyan",
                      },
                      {
                        label: "Microformats",
                        value: data.markup.microformats,
                        color: "gray",
                      },
                    ]}
                  />
                </div>

                {/* Canonicalization */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    Canonicalization
                    {data.canonical.noCanonical > 0 && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-950/50 text-yellow-400">
                        {data.canonical.noCanonical} missing
                      </span>
                    )}
                  </h3>
                  <BarChart
                    maxVal={totalPages}
                    rows={[
                      {
                        label: "Self-canonical",
                        value: data.canonical.selfCanonical,
                        color: "green",
                      },
                      {
                        label: "Canonical to other",
                        value: data.canonical.canonicalToOther,
                        color: "blue",
                      },
                      {
                        label: "No canonical tag",
                        value: data.canonical.noCanonical,
                        color: "red",
                      },
                    ]}
                  />
                  {data.no_canonical_pages.length > 0 && (
                    <div className="mt-3">
                      {data.no_canonical_pages.map((u) => (
                        <div
                          key={u}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                        >
                          <span className="text-sm truncate mr-4">{u}</span>
                          <span className="text-xs font-mono text-red-400 shrink-0">
                            missing
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hreflang Usage */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Hreflang Usage
                  </h3>
                  <BarChart
                    maxVal={totalPages}
                    rows={[
                      {
                        label: "Valid hreflang",
                        value: data.hreflang.valid,
                        color: "green",
                      },
                      {
                        label: "With issues",
                        value: data.hreflang.withIssues,
                        color: "red",
                      },
                      {
                        label: "Without hreflang",
                        value: data.hreflang.withoutHreflang,
                        color: "gray",
                      },
                    ]}
                  />
                </div>

                {/* AMP Links */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    AMP Links
                  </h3>
                  <BarChart
                    maxVal={totalPages}
                    rows={[
                      {
                        label: "Has AMP link",
                        value: data.amp.withAmp,
                        color: "green",
                      },
                      {
                        label: "No AMP link",
                        value: data.amp.withoutAmp,
                        color: "gray",
                      },
                    ]}
                  />
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
}

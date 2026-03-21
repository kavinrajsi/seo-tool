"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  Unlink,
  LinkIcon,
  ExternalLinkIcon,
  SearchIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from "lucide-react";

function StatusBadge({ status }) {
  if (status === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-400">
        Timeout
      </span>
    );
  }
  if (status >= 500) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
        {status} Server Error
      </span>
    );
  }
  if (status >= 400) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400">
        {status} {status === 404 ? "Not Found" : "Client Error"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
      {status} OK
    </span>
  );
}

export default function BrokenLinks() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState("all"); // all | internal | external
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, [activeProject]);

  useEffect(() => {
    if (activeProject?.domain) {
      setUrl(activeProject.domain.replace(/^https?:\/\//, ""));
    }
  }, [activeProject]);

  async function loadHistory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    let query = supabase
      .from("broken_link_reports")
      .select("id, url, data, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", user.id).is("team_id", null);
    }

    if (activeProject) {
      query = query.eq("project_id", activeProject.id);
    }

    const { data } = await query;
    if (data) setHistory(data);
  }

  async function handleCheck(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await apiFetch("/api/broken-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);

      // Save to Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("broken_link_reports").insert({
          user_id: user.id,
          team_id: activeTeam?.id || null,
          project_id: activeProject?.id || null,
          url: data.url,
          data,
        });
        loadHistory();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredLinks = result
    ? result.broken_links.filter((l) =>
        filter === "all" ? true : l.type === filter
      )
    : [];

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Broken Link Checker
        </h1>
        <p className="text-muted-foreground mt-1">
          Crawl your site to find dead internal and external links.
        </p>
      </div>

      {/* URL Input */}
      <form onSubmit={handleCheck} className="flex gap-2">
        <input
          type="text"
          placeholder="Enter a URL to check (e.g. example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
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
              Check Links
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
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCwIcon className="h-5 w-5 animate-spin mr-2" />
          Crawling pages and checking links... This may take up to a minute.
        </div>
      )}

      {result && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <SearchIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Pages Crawled
                </span>
              </div>
              <p className="text-3xl font-semibold">{result.pages_crawled}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <LinkIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Total Links
                </span>
              </div>
              <p className="text-3xl font-semibold">
                {(
                  result.total_internal_links + result.total_external_links
                ).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.total_internal_links} internal /{" "}
                {result.total_external_links} external
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Unlink className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Broken Links
                </span>
              </div>
              <p
                className={`text-3xl font-semibold ${
                  result.summary.total_broken > 0
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {result.summary.total_broken}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.summary.broken_internal} internal /{" "}
                {result.summary.broken_external} external
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ExternalLinkIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  External Checked
                </span>
              </div>
              <p className="text-3xl font-semibold">
                {result.external_links_checked}
              </p>
            </div>
          </div>

          {/* Status banner */}
          {result.summary.total_broken === 0 ? (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4" />
              No broken links found! All checked links are healthy.
            </div>
          ) : (
            <div className="rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-400 flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4" />
              Found {result.summary.total_broken} broken link
              {result.summary.total_broken !== 1 ? "s" : ""}. Review the table
              below for details.
            </div>
          )}

          {/* Filter + Results table */}
          {result.broken_links.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Broken Links</h3>
                <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
                  {[
                    { key: "all", label: "All" },
                    { key: "internal", label: "Internal" },
                    { key: "external", label: "External" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                        filter === f.key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Source Page
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Broken URL
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Link Text
                      </th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLinks.map((link, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-3 pr-4 max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                          {link.source.replace(/^https?:\/\//, "")}
                        </td>
                        <td className="py-3 pr-4 max-w-[250px] truncate font-mono text-xs">
                          {link.target.replace(/^https?:\/\//, "")}
                        </td>
                        <td className="py-3 pr-4 max-w-[150px] truncate text-muted-foreground">
                          {link.text || "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              link.type === "internal"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-purple-500/10 text-purple-400"
                            }`}
                          >
                            {link.type}
                          </span>
                        </td>
                        <td className="py-3">
                          <StatusBadge status={link.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLinks.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No broken {filter} links found.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* History */}
      {history.length > 0 && !result && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Recent Checks</h3>
          <div className="space-y-2">
            {history.map((item) => {
              const d = item.data;
              return (
                <button
                  key={item.id}
                  onClick={() => setResult(d)}
                  className="flex w-full items-center justify-between rounded-md border border-border/50 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.url.replace(/^https?:\/\//, "")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        d?.summary?.total_broken > 0
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      {d?.summary?.total_broken ?? 0} broken
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d?.pages_crawled ?? 0} pages
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

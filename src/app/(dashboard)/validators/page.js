"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  ShieldCheckIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  FileTextIcon,
  MapIcon,
} from "lucide-react";

export default function Validators() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [tab, setTab] = useState("robots"); // robots | sitemap
  const [url, setUrl] = useState("");
  const [testPath, setTestPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, [activeTeam, activeProject, tab]);

  useEffect(() => {
    if (activeProject?.domain) {
      setUrl(activeProject.domain.replace(/^https?:\/\//, ""));
    }
  }, [activeProject]);

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("validator_reports")
      .select("id, url, type, data, created_at")
      .eq("type", tab)
      .order("created_at", { ascending: false })
      .limit(10);

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", user.id).is("team_id", null);
    }

    const { data } = await query;
    if (data) setHistory(data);
  }

  async function handleValidate(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const body = { url: url.trim(), type: tab };
      if (tab === "robots" && testPath.trim()) {
        body.testPath = testPath.trim();
      }

      const res = await apiFetch("/api/validators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("validator_reports").insert({
          user_id: user.id,
          team_id: activeTeam?.id || null,
          url: url.trim(),
          type: tab,
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

  // Test a specific URL against robots rules (client-side re-test)
  async function handleTestUrl() {
    if (!testPath.trim() || !url.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/validators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          type: "robots",
          testPath: testPath.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Robots.txt & Sitemap Validator
        </h1>
        <p className="text-muted-foreground mt-1">
          Validate your robots.txt rules and sitemap XML structure.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5 w-fit">
        <button
          onClick={() => {
            setTab("robots");
            setResult(null);
            setError("");
          }}
          className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "robots"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileTextIcon className="h-4 w-4" />
          Robots.txt
        </button>
        <button
          onClick={() => {
            setTab("sitemap");
            setResult(null);
            setError("");
          }}
          className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "sitemap"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapIcon className="h-4 w-4" />
          Sitemap
        </button>
      </div>

      {/* URL Input */}
      <form onSubmit={handleValidate} className="flex gap-2">
        <input
          type="text"
          placeholder={
            tab === "robots"
              ? "Enter domain (e.g. example.com)"
              : "Enter domain or sitemap URL (e.g. example.com/sitemap.xml)"
          }
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
            <RefreshCwIcon className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheckIcon className="h-4 w-4" />
          )}
          Validate
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
          Fetching and validating...
        </div>
      )}

      {/* ── Robots.txt Results ──────────────────────────────────── */}
      {result && tab === "robots" && (
        <>
          {/* Status */}
          <div
            className={`rounded-md border px-4 py-3 text-sm flex items-center gap-2 ${
              !result.found
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : result.issues?.length > 0
                  ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                  : "border-green-500/30 bg-green-500/10 text-green-400"
            }`}
          >
            {!result.found ? (
              <>
                <XCircleIcon className="h-4 w-4" />
                robots.txt not found (HTTP {result.status})
              </>
            ) : result.issues?.length > 0 ? (
              <>
                <AlertTriangleIcon className="h-4 w-4" />
                Found {result.issues.length} issue
                {result.issues.length !== 1 ? "s" : ""} in robots.txt
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                robots.txt is valid — no issues found
              </>
            )}
          </div>

          {result.found && (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* User-agent groups */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-medium mb-4">
                  User-Agent Groups ({result.groups?.length || 0})
                </h3>
                {result.groups?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No user-agent groups found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {result.groups?.map((group, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border/50 p-3"
                      >
                        <p className="text-sm font-medium mb-2">
                          User-agent:{" "}
                          <span className="font-mono text-primary">
                            {group.userAgent}
                          </span>
                        </p>
                        {group.rules.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No rules
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {group.rules.map((rule, j) => (
                              <p
                                key={j}
                                className="text-xs font-mono text-muted-foreground"
                              >
                                <span
                                  className={
                                    rule.type === "disallow"
                                      ? "text-red-400"
                                      : rule.type === "allow"
                                        ? "text-green-400"
                                        : "text-yellow-400"
                                  }
                                >
                                  {rule.type}
                                </span>
                                : {rule.path || "(empty)"}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Issues + Sitemaps + URL Tester */}
              <div className="space-y-4">
                {/* Issues */}
                {result.issues?.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-5">
                    <h3 className="text-sm font-medium mb-4">Issues</h3>
                    <div className="space-y-2">
                      {result.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="flex gap-2 text-sm text-orange-400"
                        >
                          <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <p>{issue.issue}</p>
                            {issue.text && (
                              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                                Line {issue.line}: {issue.text}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sitemaps referenced */}
                {result.sitemaps?.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-5">
                    <h3 className="text-sm font-medium mb-3">
                      Sitemaps Referenced
                    </h3>
                    <div className="space-y-1">
                      {result.sitemaps.map((sm, i) => (
                        <p
                          key={i}
                          className="text-xs font-mono text-muted-foreground truncate"
                        >
                          {sm}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* URL Tester */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-medium mb-3">
                    Test URL Against Rules
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="/path/to/test"
                      value={testPath}
                      onChange={(e) => setTestPath(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTestUrl()}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      onClick={handleTestUrl}
                      disabled={loading || !testPath.trim()}
                      className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
                    >
                      Test
                    </button>
                  </div>
                  {result.testResult && (
                    <div
                      className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                        result.testResult.allowed
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : "border-red-500/30 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {result.testResult.allowed ? "Allowed" : "Blocked"}
                      {result.testResult.matchedRule && (
                        <span className="text-xs ml-2 opacity-70">
                          (matched: {result.testResult.matchedRule})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Raw content */}
          {result.raw && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-3">Raw Content</h3>
              <pre className="rounded-md bg-background border border-border p-4 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap text-muted-foreground">
                {result.raw}
              </pre>
            </div>
          )}
        </>
      )}

      {/* ── Sitemap Results ──────────────────────────────────────── */}
      {result && tab === "sitemap" && (
        <>
          {/* Status */}
          <div
            className={`rounded-md border px-4 py-3 text-sm flex items-center gap-2 ${
              !result.found
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : result.issues?.length > 0
                  ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                  : "border-green-500/30 bg-green-500/10 text-green-400"
            }`}
          >
            {!result.found ? (
              <>
                <XCircleIcon className="h-4 w-4" />
                Sitemap not found at {result.url} (HTTP {result.status})
              </>
            ) : result.issues?.length > 0 ? (
              <>
                <AlertTriangleIcon className="h-4 w-4" />
                Found {result.issues.length} issue
                {result.issues.length !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                Sitemap is valid
              </>
            )}
          </div>

          {result.found && (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapIcon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      URLs Found
                    </span>
                  </div>
                  <p className="text-3xl font-semibold">{result.urlCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.isIndex ? "Sitemap Index" : "URL Set"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <AlertTriangleIcon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Issues
                    </span>
                  </div>
                  <p
                    className={`text-3xl font-semibold ${
                      result.issues?.length > 0
                        ? "text-orange-400"
                        : "text-green-400"
                    }`}
                  >
                    {result.issues?.length || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <SearchIcon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Spot Checks
                    </span>
                  </div>
                  <p className="text-3xl font-semibold">
                    {result.spotChecks?.filter((s) => s.status >= 200 && s.status < 400).length || 0}
                    /{result.spotChecks?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    URLs reachable
                  </p>
                </div>
              </div>

              {/* Issues list */}
              {result.issues?.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-medium mb-4">Issues</h3>
                  <div className="space-y-2">
                    {result.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex gap-2 text-sm text-orange-400"
                      >
                        <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>{issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spot checks */}
              {result.spotChecks?.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-medium mb-4">
                    URL Spot Checks (sample of {result.spotChecks.length})
                  </h3>
                  <div className="space-y-2">
                    {result.spotChecks.map((check, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
                      >
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[80%]">
                          {check.url.replace(/^https?:\/\//, "")}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            check.status >= 200 && check.status < 400
                              ? "text-green-400"
                              : check.status === 0
                                ? "text-zinc-400"
                                : "text-red-400"
                          }`}
                        >
                          {check.status === 0 ? "Timeout" : check.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* URL list (first 20) */}
              {result.urls?.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-medium mb-4">
                    URLs in Sitemap{" "}
                    {result.urls.length > 20 && (
                      <span className="text-muted-foreground font-normal">
                        (showing 20 of {result.urls.length})
                      </span>
                    )}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-3 pr-4 font-medium text-muted-foreground">
                            URL
                          </th>
                          <th className="pb-3 pr-4 font-medium text-muted-foreground">
                            Last Modified
                          </th>
                          <th className="pb-3 pr-4 font-medium text-muted-foreground">
                            Priority
                          </th>
                          <th className="pb-3 font-medium text-muted-foreground">
                            Change Freq
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.urls.slice(0, 20).map((entry, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="py-2 pr-4 font-mono text-xs text-muted-foreground max-w-[300px] truncate">
                              {entry.url.replace(/^https?:\/\//, "")}
                            </td>
                            <td className="py-2 pr-4 text-xs text-muted-foreground">
                              {entry.lastmod || "—"}
                            </td>
                            <td className="py-2 pr-4 text-xs text-muted-foreground">
                              {entry.priority || "—"}
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {entry.changefreq || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* History */}
      {history.length > 0 && !result && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">
            Recent {tab === "robots" ? "Robots.txt" : "Sitemap"} Validations
          </h3>
          <div className="space-y-2">
            {history.map((item) => {
              const d = item.data;
              const issueCount = d?.issues?.length || 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setResult(d);
                    setUrl(item.url);
                  }}
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
                        !d?.found
                          ? "text-red-400"
                          : issueCount > 0
                            ? "text-orange-400"
                            : "text-green-400"
                      }`}
                    >
                      {!d?.found
                        ? "Not found"
                        : issueCount > 0
                          ? `${issueCount} issue${issueCount !== 1 ? "s" : ""}`
                          : "Valid"}
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

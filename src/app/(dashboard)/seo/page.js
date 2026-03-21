"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logError } from "@/lib/logger";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { FullReportPdfButton } from "@/components/full-report-pdf-button";
import { SerpPreview } from "@/components/serp-preview";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { SearchIcon, RefreshCwIcon } from "lucide-react";

const CATEGORY_ORDER = [
  "on-page",
  "technical",
  "content",
  "images",
  "security",
  "structured-data",
  "resources",
];

const CATEGORY_LABELS = {
  "on-page": "On-Page SEO",
  technical: "Technical SEO",
  content: "Content & Keywords",
  images: "Images & Media",
  security: "Security",
  "structured-data": "Structured Data & Files",
  resources: "Resources & Performance",
};

export default function Dashboard() {
  const router = useRouter();
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    loadHistory();
  }, [activeProject]);

  useEffect(() => {
    if (activeProject?.domain) {
      const domain = activeProject.domain.replace(/^https?:\/\//, "");
      setUrl(domain);

      // Load latest existing analysis for this domain
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existing } = await supabase
          .from("seo_analyses")
          .select("data")
          .or(`url.eq.${activeProject.domain},url.eq.https://${domain},url.eq.http://${domain}`)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existing?.length > 0 && existing[0].data) {
          setResult(existing[0].data);
        }
      })();
    }
  }, [activeProject]);

  // When result changes, default first 2 category sections to open
  useEffect(() => {
    if (result?.category_scores) {
      const categories = CATEGORY_ORDER.filter(
        (cat) => result.category_scores[cat]
      );
      const initial = {};
      categories.forEach((cat, i) => {
        initial[cat] = i < 2;
      });
      setOpenSections(initial);
    }
  }, [result]);

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("seo_analyses")
      .select("id, url, score, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", user.id).is("team_id", null);
    }

    const { data } = await query;
    if (data) setHistory(data);
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await apiFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        setLoading(false);
        return;
      }

      setResult(data);

      // Save to Supabase (client has auth session)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("seo_analyses").insert({
          user_id: user.id,
          team_id: activeTeam?.id || null,
          url: data.url,
          score: data.score,
          data: data,
        });
      }

      loadHistory();
    } catch (err) {
      logError("seo/analyze", err);
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  function loadFromHistory(item) {
    supabase
      .from("seo_analyses")
      .select("data")
      .eq("id", item.id)
      .single()
      .then(({ data }) => {
        if (data?.data) setResult(data.data);
      });
  }

  function getScoreClass(score) {
    if (score >= 70) return "bg-green-500/10 text-green-400 border-2 border-green-600";
    if (score >= 40) return "bg-orange-500/10 text-orange-400 border-2 border-orange-600";
    return "bg-red-500/10 text-red-400 border-2 border-red-600";
  }

  function getScoreColor(score) {
    if (score >= 70) return "var(--color-green-400, #4ade80)";
    if (score >= 40) return "var(--color-orange-400, #fb923c)";
    return "var(--color-red-400, #f87171)";
  }

  function getBarColorClass(pct) {
    if (pct >= 70) return "bg-green-400";
    if (pct >= 40) return "bg-orange-400";
    return "bg-red-400";
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  function getOrderedCategories() {
    if (!result?.category_scores) return [];
    return CATEGORY_ORDER.filter((cat) => result.category_scores[cat]);
  }

  function getChecksByCategory() {
    if (!result?.checks) return {};
    const grouped = {};
    for (const check of result.checks) {
      const cat = check.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(check);
    }
    return grouped;
  }

  function getStatusIcon(status) {
    if (status === "pass") return "\u2713";
    if (status === "warning") return "\u26A0";
    return "\u2717";
  }

  function getStatusClass(status) {
    if (status === "pass") return "text-green-400";
    if (status === "warning") return "text-orange-400";
    return "text-red-400";
  }

  function getCloudFontSize(count, minCount, maxCount) {
    if (maxCount === minCount) return 20;
    const ratio = (count - minCount) / (maxCount - minCount);
    return Math.round(13 + ratio * 19); // 13px to 32px
  }

  const hasNewFormat = result?.category_scores !== undefined;
  const orderedCategories = hasNewFormat ? getOrderedCategories() : [];
  const checksByCategory = hasNewFormat ? getChecksByCategory() : {};

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            SEO Analyzer
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze any URL for on-page SEO, technical issues, content quality, and more.
          </p>
        </div>

        {/* URL Input Form */}
        <form className="flex gap-2" onSubmit={handleAnalyze}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a URL to analyze (e.g. example.com)"
            required
            className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <SearchIcon className="h-4 w-4" />
                Analyze
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
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <svg className="h-5 w-5 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-muted-foreground">
              Analyzing {url}... This may take up to 60 seconds.
            </span>
          </div>
        )}

        {result && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <FullReportPdfButton seoResult={result} />
              <ExportPdfButton
                result={result}
                filename={`seo-report-${(result.url || "analysis").replace(/^https?:\/\//, "").replace(/[^a-z0-9.]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`}
              />
            </div>
            {/* Score Card */}
            <div className="flex items-center gap-6 p-6 rounded-xl border border-border bg-card mb-6 max-[600px]:flex-col max-[600px]:text-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-[28px] font-bold font-mono shrink-0 ${getScoreClass(result.score)}`}
              >
                {result.score}
              </div>
              <div>
                <h2 className="text-base font-semibold mb-1 break-all">{result.url}</h2>
                <p className="text-xs text-muted-foreground">
                  {result.score >= 70
                    ? "Good SEO health"
                    : result.score >= 40
                      ? "Needs improvement"
                      : "Critical issues found"}
                </p>
              </div>
            </div>

            {/* Category Score Breakdown */}
            {hasNewFormat && (
              <div className="flex flex-col gap-3 p-5 rounded-lg bg-card border border-border mb-6">
                {orderedCategories.map((cat) => {
                  const catScore = result.category_scores[cat];
                  const pct = Math.round(catScore.pct);
                  return (
                    <div key={cat} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                        <span className="text-xs font-semibold font-mono text-foreground">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted/30 rounded-sm overflow-hidden">
                        <div
                          className={`h-full rounded-sm transition-[width] duration-400 ease-out ${getBarColorClass(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mb-6 max-[600px]:grid-cols-2">
              <div className="p-4 rounded-lg bg-card border border-border text-center">
                <div className="text-[28px] font-bold font-mono text-foreground">{result.word_count}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Words</div>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border text-center">
                <div className="text-[28px] font-bold font-mono text-foreground">{result.h1s?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">H1 Tags</div>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border text-center">
                <div className="text-[28px] font-bold font-mono text-foreground">
                  {result.images_with_alt}/{result.total_images}
                </div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Img Alt</div>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border text-center">
                <div className="text-[28px] font-bold font-mono text-foreground">{result.internal_links}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Internal Links</div>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border text-center">
                <div className="text-[28px] font-bold font-mono text-foreground">{result.external_links}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">External Links</div>
              </div>
              {result.html_size_kb !== undefined && (
                <div className="p-4 rounded-lg bg-card border border-border text-center">
                  <div className="text-[28px] font-bold font-mono text-foreground">
                    {Math.round(result.html_size_kb)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">HTML KB</div>
                </div>
              )}
              {result.dom_node_count !== undefined && (
                <div className="p-4 rounded-lg bg-card border border-border text-center">
                  <div className="text-[28px] font-bold font-mono text-foreground">
                    {result.dom_node_count.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">DOM Nodes</div>
                </div>
              )}
            </div>

            {/* Grouped Check Sections (new format) */}
            {hasNewFormat ? (
              <div className="flex flex-col gap-2 mb-6">
                {orderedCategories.map((cat) => {
                  const checks = checksByCategory[cat] || [];
                  const passCount = checks.filter(
                    (c) => c.status === "pass"
                  ).length;
                  const isOpen = openSections[cat] ?? false;

                  return (
                    <Collapsible
                      key={cat}
                      open={isOpen}
                      onOpenChange={(open) =>
                        setOpenSections((prev) => ({ ...prev, [cat]: open }))
                      }
                    >
                      <div className="rounded-lg bg-card border border-border overflow-hidden">
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-3.5 px-4 bg-transparent border-none text-foreground cursor-pointer  transition-colors duration-150 hover:bg-muted/30">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold">
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                              {passCount}/{checks.length}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {isOpen ? "\u25B4" : "\u25BE"}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="flex flex-col border-t border-border">
                            {checks.map((check, i) => (
                              <div key={i} className="flex items-center gap-2.5 py-2.5 px-4 text-xs border-b border-border last:border-b-0 max-[600px]:flex-wrap">
                                <span
                                  className={`shrink-0 text-sm w-[18px] text-center ${getStatusClass(check.status)}`}
                                >
                                  {getStatusIcon(check.status)}
                                </span>
                                <span className="text-foreground whitespace-nowrap">
                                  {check.name}
                                </span>
                                {check.message && (
                                  <span className="text-muted-foreground ml-auto text-right text-xs shrink min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-[600px]:w-full max-[600px]:ml-7 max-[600px]:text-left max-[600px]:whitespace-normal">
                                    {check.message}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              /* Flat checks fallback for old data */
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">SEO Checks</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2 max-[600px]:grid-cols-1">
                  {result.checks?.map((check, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg bg-card border border-border text-xs ${check.pass ? "text-green-400" : "text-red-400"}`}
                    >
                      <span className="shrink-0 text-sm w-[18px] text-center">
                        {check.pass ? "\u2713" : "\u2717"}
                      </span>
                      {check.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SERP & Social Previews */}
            <SerpPreview result={result} />

            {/* SEO Recommendations */}
            {result.checks && <RecommendationsPanel checks={result.checks} />}

            {/* Keyword Cloud */}
            {result.keyword_cloud && result.keyword_cloud.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Keywords</h3>
                <div className="flex flex-wrap gap-y-3 gap-x-4 items-center p-5 rounded-lg bg-card border border-border">
                  {(() => {
                    const counts = result.keyword_cloud.map((k) => k.count);
                    const minCount = Math.min(...counts);
                    const maxCount = Math.max(...counts);
                    return result.keyword_cloud.map((kw, i) => (
                      <span
                        key={i}
                        className={`text-muted-foreground  leading-snug transition-colors duration-150 cursor-default hover:text-foreground ${i % 3 === 0 ? "text-green-400 hover:text-green-300" : ""}`}
                        style={{
                          fontSize: `${getCloudFontSize(kw.count, minCount, maxCount)}px`,
                        }}
                      >
                        {kw.word}
                      </span>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* llms.txt */}
            {result.llms_txt && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Search — llms.txt</h3>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="text-sm font-medium mb-3">
                    <span
                      className={
                        result.llms_txt.valid
                          ? "text-green-400"
                          : result.llms_txt.exists
                            ? "text-orange-400"
                            : "text-red-400"
                      }
                    >
                      {result.llms_txt.valid
                        ? "\u2713 Properly formatted"
                        : result.llms_txt.exists
                          ? "\u26A0 Has formatting issues"
                          : "\u2717 Not found"}
                    </span>
                  </div>
                  {result.llms_txt.issues?.length > 0 && (
                    <ul className="list-none flex flex-col gap-2">
                      {result.llms_txt.issues.map((issue, i) => (
                        <li key={i} className="text-xs text-muted-foreground py-2 px-3 bg-muted/30 rounded-md border-l-[3px] border-l-red-400 leading-snug">{issue}</li>
                      ))}
                    </ul>
                  )}
                  {result.llms_txt.valid && (
                    <p className="text-xs text-green-400 leading-normal">
                      Your llms.txt is correctly formatted. AI search engines
                      can accurately interpret your site content.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Page Details */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Page Details</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 max-[600px]:grid-cols-1">
                <dl className="p-4 rounded-lg bg-card border border-border">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Title</dt>
                  <dd className="text-sm text-foreground break-words leading-normal">
                    {result.title || (
                      <span className="text-muted-foreground/50 italic">Missing</span>
                    )}
                  </dd>
                </dl>
                <dl className="p-4 rounded-lg bg-card border border-border">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Meta Description</dt>
                  <dd className="text-sm text-foreground break-words leading-normal">
                    {result.meta_description || (
                      <span className="text-muted-foreground/50 italic">Missing</span>
                    )}
                  </dd>
                </dl>
                <dl className="p-4 rounded-lg bg-card border border-border">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Canonical URL</dt>
                  <dd className="text-sm text-foreground break-words leading-normal">
                    {result.canonical || (
                      <span className="text-muted-foreground/50 italic">Not set</span>
                    )}
                  </dd>
                </dl>
                <dl className="p-4 rounded-lg bg-card border border-border">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">OG Title</dt>
                  <dd className="text-sm text-foreground break-words leading-normal">
                    {result.og_title || (
                      <span className="text-muted-foreground/50 italic">Missing</span>
                    )}
                  </dd>
                </dl>
                <dl className="p-4 rounded-lg bg-card border border-border">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">OG Description</dt>
                  <dd className="text-sm text-foreground break-words leading-normal">
                    {result.og_description || (
                      <span className="text-muted-foreground/50 italic">Missing</span>
                    )}
                  </dd>
                </dl>
                <dl className="p-4 rounded-lg bg-card border border-border">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Language</dt>
                  <dd className="text-sm text-foreground break-words leading-normal">
                    {result.lang || (
                      <span className="text-muted-foreground/50 italic">Not set</span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-10">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Analyses</h3>
            <div className="flex flex-col gap-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-3 px-4 rounded-lg bg-card border border-border cursor-pointer transition-[border-color] duration-150 hover:border-border"
                  onClick={() => loadFromHistory(item)}
                >
                  <span className="text-sm text-foreground break-all">{item.url}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-sm font-semibold font-mono"
                      style={{ color: getScoreColor(item.score) }}
                    >
                      {item.score}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

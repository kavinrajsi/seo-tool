"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ExportPdfButton } from "@/components/export-pdf-button";
import styles from "./seo.module.scss";

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
  const reportRef = useRef(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    loadHistory();
  }, []);

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
    const { data } = await supabase
      .from("seo_analyses")
      .select("id, url, score, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setHistory(data);
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
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
          url: data.url,
          score: data.score,
          data: data,
        });
      }

      loadHistory();
    } catch {
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
    if (score >= 70) return styles.scoreGood;
    if (score >= 40) return styles.scoreOk;
    return styles.scoreBad;
  }

  function getScoreColor(score) {
    if (score >= 70) return "#66bb6a";
    if (score >= 40) return "#ffa726";
    return "#ef5350";
  }

  function getBarColorClass(pct) {
    if (pct >= 70) return styles.barGood;
    if (pct >= 40) return styles.barWarning;
    return styles.barBad;
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
    if (status === "pass") return styles.statusPass;
    if (status === "warning") return styles.statusWarning;
    return styles.statusFail;
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
    <div className={styles.page}>
      <div className={styles.content}>
        {/* URL Input Form */}
        <form className={styles.analyzeForm} onSubmit={handleAnalyze}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a URL to analyze (e.g. example.com)"
            required
          />
          <button
            type="submit"
            className={styles.analyzeBtn}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {result && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <ExportPdfButton
                targetRef={reportRef}
                filename={`seo-report-${result.url?.replace(/[^a-z0-9]/gi, "-") || "analysis"}`}
              />
            </div>
            <div ref={reportRef}>
            {/* Score Card */}
            <div className={styles.scoreCard}>
              <div
                className={`${styles.scoreCircle} ${getScoreClass(result.score)}`}
              >
                {result.score}
              </div>
              <div className={styles.scoreInfo}>
                <h2>{result.url}</h2>
                <p>
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
              <div className={styles.scoreBreakdown}>
                {orderedCategories.map((cat) => {
                  const catScore = result.category_scores[cat];
                  const pct = Math.round(catScore.pct);
                  return (
                    <div key={cat} className={styles.categoryBar}>
                      <div className={styles.categoryBarHeader}>
                        <span className={styles.categoryBarLabel}>
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                        <span className={styles.categoryBarPct}>{pct}%</span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={`${styles.barFill} ${getBarColorClass(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats Row */}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.value}>{result.word_count}</div>
                <div className={styles.label}>Words</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.value}>{result.h1s?.length || 0}</div>
                <div className={styles.label}>H1 Tags</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.value}>
                  {result.images_with_alt}/{result.total_images}
                </div>
                <div className={styles.label}>Img Alt</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.value}>{result.internal_links}</div>
                <div className={styles.label}>Internal Links</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.value}>{result.external_links}</div>
                <div className={styles.label}>External Links</div>
              </div>
              {result.html_size_kb !== undefined && (
                <div className={styles.stat}>
                  <div className={styles.value}>
                    {Math.round(result.html_size_kb)}
                  </div>
                  <div className={styles.label}>HTML KB</div>
                </div>
              )}
              {result.dom_node_count !== undefined && (
                <div className={styles.stat}>
                  <div className={styles.value}>
                    {result.dom_node_count.toLocaleString()}
                  </div>
                  <div className={styles.label}>DOM Nodes</div>
                </div>
              )}
            </div>

            {/* Grouped Check Sections (new format) */}
            {hasNewFormat ? (
              <div className={styles.checkSections}>
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
                      <div className={styles.checkSection}>
                        <CollapsibleTrigger className={styles.sectionTrigger}>
                          <div className={styles.sectionTriggerContent}>
                            <span className={styles.sectionTitle}>
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                            <span className={styles.sectionCount}>
                              {passCount}/{checks.length}
                            </span>
                          </div>
                          <span className={styles.chevron}>
                            {isOpen ? "\u25B4" : "\u25BE"}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className={styles.checkList}>
                            {checks.map((check, i) => (
                              <div key={i} className={styles.checkRow}>
                                <span
                                  className={`${styles.checkIcon} ${getStatusClass(check.status)}`}
                                >
                                  {getStatusIcon(check.status)}
                                </span>
                                <span className={styles.checkName}>
                                  {check.name}
                                </span>
                                {check.message && (
                                  <span className={styles.checkMessage}>
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
              <div className={styles.section}>
                <h3>SEO Checks</h3>
                <div className={styles.checks}>
                  {result.checks?.map((check, i) => (
                    <div
                      key={i}
                      className={`${styles.checkItem} ${check.pass ? styles.checkPass : styles.checkFail}`}
                    >
                      <span className={styles.checkIcon}>
                        {check.pass ? "\u2713" : "\u2717"}
                      </span>
                      {check.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keyword Cloud */}
            {result.keyword_cloud && result.keyword_cloud.length > 0 && (
              <div className={styles.section}>
                <h3>Top Keywords</h3>
                <div className={styles.keywordCloud}>
                  {(() => {
                    const counts = result.keyword_cloud.map((k) => k.count);
                    const minCount = Math.min(...counts);
                    const maxCount = Math.max(...counts);
                    return result.keyword_cloud.map((kw, i) => (
                      <span
                        key={i}
                        className={`${styles.keywordTag} ${i % 3 === 0 ? styles.keywordAccent : ""}`}
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
              <div className={styles.section}>
                <h3>AI Search — llms.txt</h3>
                <div className={styles.llmsCard}>
                  <div className={styles.llmsStatus}>
                    <span
                      className={
                        result.llms_txt.valid
                          ? styles.checkPass
                          : result.llms_txt.exists
                            ? styles.scoreOkText
                            : styles.checkFail
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
                    <ul className={styles.llmsIssues}>
                      {result.llms_txt.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  )}
                  {result.llms_txt.valid && (
                    <p className={styles.llmsOk}>
                      Your llms.txt is correctly formatted. AI search engines
                      can accurately interpret your site content.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Page Details */}
            <div className={styles.section}>
              <h3>Page Details</h3>
              <div className={styles.details}>
                <dl className={styles.detailCard}>
                  <dt>Title</dt>
                  <dd>
                    {result.title || (
                      <span className={styles.empty}>Missing</span>
                    )}
                  </dd>
                </dl>
                <dl className={styles.detailCard}>
                  <dt>Meta Description</dt>
                  <dd>
                    {result.meta_description || (
                      <span className={styles.empty}>Missing</span>
                    )}
                  </dd>
                </dl>
                <dl className={styles.detailCard}>
                  <dt>Canonical URL</dt>
                  <dd>
                    {result.canonical || (
                      <span className={styles.empty}>Not set</span>
                    )}
                  </dd>
                </dl>
                <dl className={styles.detailCard}>
                  <dt>OG Title</dt>
                  <dd>
                    {result.og_title || (
                      <span className={styles.empty}>Missing</span>
                    )}
                  </dd>
                </dl>
                <dl className={styles.detailCard}>
                  <dt>OG Description</dt>
                  <dd>
                    {result.og_description || (
                      <span className={styles.empty}>Missing</span>
                    )}
                  </dd>
                </dl>
                <dl className={styles.detailCard}>
                  <dt>Language</dt>
                  <dd>
                    {result.lang || (
                      <span className={styles.empty}>Not set</span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
            </div>
          </>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className={styles.history}>
            <h3>Recent Analyses</h3>
            <div className={styles.historyList}>
              {history.map((item) => (
                <div
                  key={item.id}
                  className={styles.historyItem}
                  onClick={() => loadFromHistory(item)}
                >
                  <span className={styles.historyUrl}>{item.url}</span>
                  <div className={styles.historyMeta}>
                    <span
                      className={styles.historyScore}
                      style={{ color: getScoreColor(item.score) }}
                    >
                      {item.score}
                    </span>
                    <span className={styles.historyDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

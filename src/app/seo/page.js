"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./seo.module.scss";

export default function Dashboard() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

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
      loadHistory();
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  function loadFromHistory(item) {
    // Fetch the full data from Supabase
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>SEO Tracker</h1>
        <button className={styles.signOut} onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      <div className={styles.content}>
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
            {/* Score */}
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

            {/* Stats */}
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
            </div>

            {/* Checks */}
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

            {/* Details */}
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

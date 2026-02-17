"use client";

import { useState, useEffect, useCallback } from "react";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getScoreClass(score) {
  if (score === "pass") return styles.scorePass;
  if (score === "warning") return styles.scoreWarning;
  return styles.scoreFail;
}

export default function LlmsTxtCheckerPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [domainInput, setDomainInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChecks = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      const res = await projectFetch(`/api/llms-txt?${params}`);
      if (res.ok) {
        const json = await res.json();
        setChecks(json.checks || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [projectFetch]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const handleCheck = useCallback(async () => {
    if (!domainInput.trim()) return;
    setError("");
    setChecking(true);
    setResult(null);
    setShowRaw(false);

    try {
      const res = await fetch("/api/llms-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput.trim(), project_id: activeProjectId || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to check domain");
        setChecking(false);
        return;
      }

      setResult(data);
      setChecks((prev) => [data, ...prev]);
      setDomainInput("");
    } catch (err) {
      setError(err.message || "Failed to check domain");
    } finally {
      setChecking(false);
    }
  }, [domainInput, activeProjectId]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm("Delete this check?")) return;
    try {
      const res = await fetch(`/api/llms-txt/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChecks((prev) => prev.filter((c) => c.id !== id));
        if (result?.id === id) setResult(null);
      }
    } catch {
      // Silent fail
    }
  }, [result]);

  const resultsJson = result?.results_json || {};

  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>llms.txt Checker</h1>
      </div>

      {/* Check form */}
      <div className={styles.addForm}>
        <div className={styles.inputField}>
          <label htmlFor="domain-input">Domain</label>
          <input
            id="domain-input"
            type="text"
            placeholder="example.com"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !checking) handleCheck();
            }}
          />
        </div>
        <button
          className={styles.addBtn}
          onClick={handleCheck}
          disabled={checking || !domainInput.trim()}
          type="button"
        >
          {checking ? <span className={styles.spinner} /> : "Check"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Result card */}
      {result && (
        <>
          {/* Stats grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${result.llms_exists ? styles.statValuePass : styles.statValueFail}`}>
                {result.llms_exists ? "Found" : "Missing"}
              </div>
              <div className={styles.statLabel}>llms.txt</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${result.llms_full_exists ? styles.statValuePass : styles.statValueWarn}`}>
                {result.llms_full_exists ? "Found" : "Missing"}
              </div>
              <div className={styles.statLabel}>llms-full.txt</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{result.section_count}</div>
              <div className={styles.statLabel}>Sections</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{result.link_count}</div>
              <div className={styles.statLabel}>Links</div>
            </div>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <span className={styles.resultDomain}>{result.domain}</span>
              <span className={`${styles.scoreBadge} ${getScoreClass(result.score)}`}>
                {result.score}
              </span>
            </div>

            {/* Title & Description */}
            {result.title && (
              <div style={{ marginBottom: "8px" }}>
                <span className={styles.subHeading}>Title</span>
                <div style={{ fontSize: "0.85rem", color: "#111827", fontWeight: 600 }}>{result.title}</div>
              </div>
            )}
            {result.description && (
              <div style={{ marginBottom: "16px" }}>
                <span className={styles.subHeading}>Description</span>
                <div style={{ fontSize: "0.82rem", color: "#374151" }}>{result.description}</div>
              </div>
            )}

            {/* Sections */}
            {resultsJson.sections && resultsJson.sections.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div className={styles.sectionsTitle}>Sections ({resultsJson.sections.length})</div>
                {resultsJson.sections.map((section, idx) => (
                  <div key={idx} className={styles.sectionBlock}>
                    <div className={styles.sectionName}>{section.title}</div>
                    {section.links && section.links.length > 0 && (
                      <ul className={styles.sectionLinks}>
                        {section.links.map((link, li) => (
                          <li key={li}>
                            <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
                            {link.description && <span className={styles.linkDesc}>— {link.description}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Issues */}
            {resultsJson.issues && resultsJson.issues.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div className={styles.subHeading}>Issues</div>
                <ul className={styles.issuesList}>
                  {resultsJson.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {resultsJson.recommendations && resultsJson.recommendations.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div className={styles.subHeading}>Recommendations</div>
                <ul className={styles.recsList}>
                  {resultsJson.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw content toggle */}
            {resultsJson.llmsTxtRaw && (
              <>
                <button
                  className={styles.rawToggle}
                  onClick={() => setShowRaw(!showRaw)}
                  type="button"
                >
                  {showRaw ? "Hide" : "Show"} Raw Content
                </button>
                {showRaw && (
                  <pre className={styles.rawContent}>{resultsJson.llmsTxtRaw}</pre>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Past checks history */}
      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>Past Checks</h2>

        {loading && <div className={styles.loadingState}>Loading checks...</div>}

        {!loading && checks.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className={styles.emptyTitle}>No checks yet</div>
            <div className={styles.emptyText}>Enter a domain above to check for llms.txt files.</div>
          </div>
        )}

        {!loading && checks.length > 0 && (
          <>
            <table className={styles.checksTable}>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Score</th>
                  <th>llms.txt</th>
                  <th>llms-full.txt</th>
                  <th>Sections</th>
                  <th>Links</th>
                  <th>Checked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.domainCell}>{item.domain}</td>
                    <td>
                      <span className={`${styles.scoreBadge} ${getScoreClass(item.score)}`}>
                        {item.score}
                      </span>
                    </td>
                    <td>{item.llms_exists ? "Yes" : "No"}</td>
                    <td>{item.llms_full_exists ? "Yes" : "No"}</td>
                    <td>{item.section_count}</td>
                    <td>{item.link_count}</td>
                    <td>
                      <span className={styles.dateText}>{formatDate(item.created_at)}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(item.id)}
                          type="button"
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className={styles.mobileCards}>
              {checks.map((item) => (
                <div key={item.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardHeader}>
                    <span className={styles.mobileCardDomain}>{item.domain}</span>
                    <span className={`${styles.scoreBadge} ${getScoreClass(item.score)}`}>
                      {item.score}
                    </span>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <span className={styles.metaText}>llms.txt: {item.llms_exists ? "Yes" : "No"}</span>
                    <span className={styles.metaText}>Sections: {item.section_count}</span>
                    <span className={styles.metaText}>Links: {item.link_count}</span>
                  </div>
                  <div className={styles.dateText}>{formatDate(item.created_at)}</div>
                  <div className={styles.mobileCardActions}>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(item.id)}
                      type="button"
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

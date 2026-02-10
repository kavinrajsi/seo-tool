"use client";

import { useState, useEffect, useCallback } from "react";
import BulkScanDetail from "@/app/components/BulkScanDetail";
import styles from "./page.module.css";

export default function UsagePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [shareCopiedId, setShareCopiedId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json.error || `Server error (${res.status})`);
          setLoading(false);
          return;
        }
        setStats(await res.json());
      } catch {
        setError("Network error — could not reach the server.");
      }
      setLoading(false);
    }
    load();
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") closeDrawer();
    }
    if (drawerOpen) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedReport(null);
    setDrawerError("");
  }, []);

  async function handleViewReport(log) {
    if (!log.report_id) {
      // No saved report — open on landing page as fallback
      window.open(`/?url=${encodeURIComponent(log.url)}`, "_blank");
      return;
    }

    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError("");
    setSelectedReport(null);

    try {
      const res = await fetch(`/api/reports/${log.report_id}`);
      if (!res.ok) {
        setDrawerError("Could not load report.");
        setDrawerLoading(false);
        return;
      }
      const data = await res.json();
      setSelectedReport(data);
    } catch {
      setDrawerError("Network error loading report.");
    }
    setDrawerLoading(false);
  }

  async function handleShareReport(log) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/share/${log.report_id}`,
      );
      setShareCopiedId(log.report_id);
      setTimeout(() => setShareCopiedId(null), 2000);
    } catch {
      /* silent */
    }
  }

  async function fetchReportData(reportId) {
    const res = await fetch(`/api/reports/${reportId}`);
    if (!res.ok) return null;
    return res.json();
  }

  const CHECK_TITLES = {
    title: "Title Tag Analysis",
    metaDescription: "Meta Description",
    h1: "H1 Structure",
    headingHierarchy: "Heading Hierarchy",
    metaRobots: "Meta Robots",
    sslHttps: "SSL Enabled",
    httpsRedirect: "HTTPS Redirect",
    canonicalUrl: "Canonical URL",
    mobileResponsiveness: "Mobile Responsiveness",
    pageSpeed: "Page Speed Analysis",
    imageOptimization: "Image Optimization",
    internalLinks: "Internal Links",
    externalLinks: "External Links",
    schemaMarkup: "Schema Markup",
    openGraph: "Open Graph Tags",
    twitterCards: "Twitter Cards",
    socialImageSize: "Social Image Size",
    contentAnalysis: "Content Analysis",
    urlStructure: "URL Structure",
    keywordsInUrl: "Keywords in URL",
    sitemapDetection: "Sitemap Detection",
    accessibility: "Accessibility Checks",
    hreflang: "Hreflang Tags",
    favicon: "Favicon Detection",
    lazyLoading: "Lazy Loading",
    doctype: "Doctype Validation",
    characterEncoding: "Character Encoding",
    googlePageSpeed: "Google PageSpeed Score",
    aeo: "Answer Engine Optimization (AEO)",
    geo: "Generative Engine Optimization (GEO)",
    programmaticSeo: "Programmatic SEO (pSEO)",
    aiSearchVisibility: "AI Search Visibility",
    localSeo: "Local SEO",
    socialMediaMetaTags: "Social Media Meta Tags",
    deprecatedHtmlTags: "Deprecated HTML Tags",
    googleAnalytics: "Google Analytics",
    jsErrors: "JS Error Test",
    consoleErrors: "Console Errors",
    htmlCompression: "HTML Compression/GZIP",
    htmlPageSize: "HTML Page Size",
    jsExecutionTime: "JS Execution Time",
    cdnUsage: "CDN Usage",
    modernImageFormats: "Modern Image Formats",
  };

  function buildMarkdownLines(report) {
    const results = report.results_json || {};
    const scoreLabel = (s) =>
      s === "fail" ? "FAIL" : s === "warning" ? "WARNING" : "PASS";
    const lines = [];
    lines.push("# SEO Analysis Report", "");
    lines.push(`**URL:** ${report.url}`);
    lines.push(`**Overall Score:** ${report.overall_score ?? "N/A"}/100`);
    lines.push(`**Date:** ${new Date(report.created_at).toLocaleString()}`, "");

    const entries = Object.entries(results);
    const fail = entries.filter(([, v]) => v?.score === "fail");
    const warn = entries.filter(([, v]) => v?.score === "warning");
    const pass = entries.filter(
      ([, v]) => v?.score !== "fail" && v?.score !== "warning",
    );

    function appendSection(heading, items) {
      if (items.length === 0) return;
      lines.push(`## ${heading}`, "");
      for (const [key, r] of items) {
        lines.push(
          `### ${CHECK_TITLES[key] || key} — ${scoreLabel(r?.score)}`,
          "",
        );
        if (r?.issues?.length) {
          lines.push("**Findings:**");
          for (const issue of r.issues) lines.push(`- ${issue}`);
          lines.push("");
        }
        if (r?.recommendations?.length) {
          lines.push("**How to Fix:**");
          for (const rec of r.recommendations) lines.push(`- ${rec}`);
          lines.push("");
        }
      }
    }

    appendSection(`Critical Issues (${fail.length})`, fail);
    appendSection(`Warnings (${warn.length})`, warn);
    appendSection(`Passed Checks (${pass.length})`, pass);
    return lines.join("\n");
  }

  async function handleDownloadMarkdown(log) {
    const report = await fetchReportData(log.report_id);
    if (!report) return;
    const md = buildMarkdownLines(report);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const domain = new URL(report.url).hostname;
    const ts = new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", "_")
      .replace(":", "-");
    a.href = url;
    a.download = `seo-report-${domain}-${ts}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf(log) {
    const report = await fetchReportData(log.report_id);
    if (!report) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const maxW = pageW - margin * 2;
    let y = margin;

    function checkPage(needed = 10) {
      if (y + needed > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
    }

    // Title
    pdf.setFontSize(18);
    pdf.setFont(undefined, "bold");
    pdf.text("SEO Analysis Report", margin, y);
    y += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(100);
    pdf.text(`URL: ${report.url}`, margin, y);
    y += 5;
    pdf.text(`Overall Score: ${report.overall_score ?? "N/A"}/100`, margin, y);
    y += 5;
    pdf.text(
      `Date: ${new Date(report.created_at).toLocaleString()}`,
      margin,
      y,
    );
    y += 10;
    pdf.setTextColor(0);

    const results = report.results_json || {};
    const entries = Object.entries(results);
    const fail = entries.filter(([, v]) => v?.score === "fail");
    const warn = entries.filter(([, v]) => v?.score === "warning");
    const pass = entries.filter(
      ([, v]) => v?.score !== "fail" && v?.score !== "warning",
    );

    function writeSection(heading, items, color) {
      if (items.length === 0) return;
      checkPage(14);
      pdf.setFontSize(13);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(...color);
      pdf.text(heading, margin, y);
      y += 8;
      pdf.setTextColor(0);

      for (const [key, r] of items) {
        checkPage(12);
        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.text(`${CHECK_TITLES[key] || key}`, margin + 2, y);
        y += 5;

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);
        if (r?.issues?.length) {
          for (const issue of r.issues) {
            checkPage(5);
            const lines = pdf.splitTextToSize(`• ${issue}`, maxW - 6);
            pdf.text(lines, margin + 4, y);
            y += lines.length * 4;
          }
        }
        if (r?.recommendations?.length) {
          checkPage(5);
          pdf.setTextColor(80);
          for (const rec of r.recommendations) {
            checkPage(5);
            const lines = pdf.splitTextToSize(`→ ${rec}`, maxW - 6);
            pdf.text(lines, margin + 4, y);
            y += lines.length * 4;
          }
          pdf.setTextColor(0);
        }
        y += 3;
      }
      y += 4;
    }

    writeSection(`Critical Issues (${fail.length})`, fail, [220, 38, 38]);
    writeSection(`Warnings (${warn.length})`, warn, [217, 119, 6]);
    writeSection(`Passed Checks (${pass.length})`, pass, [22, 163, 74]);

    const domain = new URL(report.url).hostname;
    const ts = new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", "_")
      .replace(":", "-");
    pdf.save(`seo-report-${domain}-${ts}.pdf`);
  }

  if (loading) {
    const s = {
      background:
        "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      borderRadius: "8px",
    };
    const b = (w, h = "14px", mb = "0") => ({
      ...s,
      width: w,
      height: h,
      marginBottom: mb,
    });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("100px", "28px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.statCard}>
              <div style={b("40%", "28px", "0.5rem")} />
              <div style={b("60%", "12px")} />
            </div>
          ))}
        </div>
        <div className={styles.section}>
          <div style={b("140px", "20px", "1rem")} />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 0",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div style={b("60%", "14px")} />
              <div style={b("80px", "12px")} />
              <div style={b("50px", "12px")} />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (error || !stats) {
    return (
      <>
        <h1 className={styles.heading}>Usage</h1>
        <div className={styles.errorCard}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 className={styles.errorTitle}>Could not load usage data</h2>
          <p className={styles.errorText}>
            {error || "An unexpected error occurred."}
          </p>
          <button
            className={styles.retryBtn}
            onClick={() => {
              setError("");
              setLoading(true);
              fetch("/api/usage")
                .then((res) => {
                  if (!res.ok) throw new Error(`Server error (${res.status})`);
                  return res.json();
                })
                .then((data) => {
                  setStats(data);
                  setLoading(false);
                })
                .catch((err) => {
                  setError(err.message);
                  setLoading(false);
                });
            }}
            type="button"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  // Map report data to scanItem shape for BulkScanDetail
  const scanItem = selectedReport
    ? {
        url: selectedReport.url,
        status: "done",
        overallScore: selectedReport.overall_score,
        data: {
          url: selectedReport.url,
          results: selectedReport.results_json,
        },
      }
    : null;

  return (
    <>
      <h1 className={styles.heading}>Usage</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalAnalyses}</div>
          <div className={styles.statLabel}>Total Analyses</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.monthlyAnalyses}</div>
          <div className={styles.statLabel}>This Month</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.todayAnalyses}</div>
          <div className={styles.statLabel}>Today</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.uniqueUrls}</div>
          <div className={styles.statLabel}>Unique URLs</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        {stats.recentLogs.length === 0 ? (
          <p className={styles.empty}>
            No activity yet. Run an analysis to see your usage stats here.
          </p>
        ) : (
          <div className={styles.logList}>
            {stats.recentLogs.map((log, i) => (
              <div
                key={i}
                className={`${styles.logItem} ${selectedReport?.url === log.url && drawerOpen ? styles.logItemActive : ""}`}
              >
                <span className={styles.logUrl}>{log.url}</span>
                <div className={styles.logMeta}>
                  {log.overall_score !== null && (
                    <div className={styles.scoreBar}>
                      <span
                        className={`${styles.scoreText} ${
                          log.overall_score >= 70
                            ? styles.scoreGood
                            : log.overall_score >= 40
                              ? styles.scoreAverage
                              : styles.scorePoor
                        }`}
                      >
                        {log.overall_score}
                        <span className={styles.scoreMax}>/100</span>
                      </span>
                      <div className={styles.progressTrack}>
                        <div
                          className={`${styles.progressFill} ${
                            log.overall_score >= 70
                              ? styles.fillGood
                              : log.overall_score >= 40
                                ? styles.fillAverage
                                : styles.fillPoor
                          }`}
                          style={{ width: `${log.overall_score}%` }}
                        />
                      </div>
                      {(log.sslEnabled !== null || log.httpsRedirect !== null) && (
                        <div className={styles.sslIndicators}>
                          <span className={`${styles.sslBadge} ${log.sslEnabled ? styles.sslPass : styles.sslFail}`}>
                            SSL: {log.sslEnabled ? "Yes" : "No"}
                          </span>
                          {log.httpsRedirect !== null && (
                            <span className={`${styles.sslBadge} ${log.httpsRedirect === "pass" ? styles.sslPass : log.httpsRedirect === "warning" ? styles.sslWarning : styles.sslFail}`}>
                              HTTPS: {log.httpsRedirect === "pass" ? "Yes" : "No"}
                            </span>
                          )}
                        </div>
                      )}
                      {log.counts && (
                        <div className={styles.severityCounts}>
                          <span
                            className={`${styles.countBadge} ${styles.countFail}`}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            {log.counts.fail}
                          </span>
                          <span
                            className={`${styles.countBadge} ${styles.countWarning}`}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            {log.counts.warning}
                          </span>
                          <span
                            className={`${styles.countBadge} ${styles.countPass}`}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            {log.counts.pass}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {log.report_id && (
                  <div className={styles.logActions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleDownloadPdf(log)}
                      type="button"
                      title="Download PDF"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleDownloadMarkdown(log)}
                      type="button"
                      title="Download Markdown"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button
                      className={`${styles.actionBtn} ${shareCopiedId === log.report_id ? styles.actionBtnActive : ""}`}
                      onClick={() => handleShareReport(log)}
                      type="button"
                      title={
                        shareCopiedId === log.report_id
                          ? "Link copied!"
                          : "Share report"
                      }
                    >
                      {shareCopiedId === log.report_id ? (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                      )}
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleViewReport(log)}
                      type="button"
                      title={log.report_id ? "View report" : "Re-analyze URL"}
                    >
                      {log.report_id ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="7" y1="17" x2="17" y2="7" />
                          <polyline points="7 7 17 7 17 17" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right-side drawer overlay */}
      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={closeDrawer}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Report Details</h2>
              <button
                className={styles.drawerClose}
                onClick={closeDrawer}
                type="button"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.drawerBody}>
              {drawerLoading && (
                <div className={styles.drawerLoading}>
                  <div className={styles.spinner} />
                  <span>Loading report...</span>
                </div>
              )}

              {drawerError && (
                <div className={styles.drawerError}>
                  <p>{drawerError}</p>
                </div>
              )}

              {scanItem && (
                <BulkScanDetail scanItem={scanItem} onClose={closeDrawer} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

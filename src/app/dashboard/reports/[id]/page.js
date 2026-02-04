"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import AnalysisCard from "@/app/components/AnalysisCard";
import HeadingTree from "@/app/components/HeadingTree";
import ScoreGauge from "@/app/components/ScoreGauge";
import OverallScoreGauge from "@/app/components/OverallScoreGauge";
import KeywordAnalysis from "@/app/components/KeywordAnalysis";
import LinkList from "@/app/components/LinkList";
import GSCDataPanel from "@/app/components/GSCDataPanel";
import styles from "./page.module.css";

const ANALYSIS_CONFIG = [
  { key: "title", title: "Title Tag Analysis", description: "Title tag length, keyword placement, and truncation." },
  { key: "metaDescription", title: "Meta Description", description: "Description length and quality." },
  { key: "h1", title: "H1 Structure", description: "H1 tag presence and keyword usage." },
  { key: "headingHierarchy", title: "Heading Hierarchy", description: "Proper H1-H6 structure." },
  { key: "metaRobots", title: "Meta Robots", description: "Noindex/nofollow directives." },
  { key: "sslHttps", title: "SSL/HTTPS Check", description: "Secure connection verification." },
  { key: "canonicalUrl", title: "Canonical URL", description: "Canonical tag configuration." },
  { key: "mobileResponsiveness", title: "Mobile Responsiveness", description: "Viewport and mobile-friendliness." },
  { key: "pageSpeed", title: "Page Speed Analysis", description: "Page size and load performance." },
  { key: "imageOptimization", title: "Image Optimization", description: "Alt text and image formats." },
  { key: "internalLinks", title: "Internal Links", description: "Internal linking analysis." },
  { key: "externalLinks", title: "External Links", description: "Outbound links and nofollow usage." },
  { key: "schemaMarkup", title: "Schema Markup", description: "JSON-LD structured data." },
  { key: "openGraph", title: "Open Graph Tags", description: "Social media optimization." },
  { key: "twitterCards", title: "Twitter Cards", description: "Twitter/X card meta tags." },
  { key: "socialImageSize", title: "Social Image Size", description: "OG/Twitter image dimensions." },
  { key: "contentAnalysis", title: "Content Analysis", description: "Word count, readability, and content quality." },
  { key: "urlStructure", title: "URL Structure", description: "URL format and SEO-friendliness." },
  { key: "keywordsInUrl", title: "Keywords in URL", description: "Relevant keywords in URL." },
  { key: "sitemapDetection", title: "Sitemap Detection", description: "XML sitemap presence." },
  { key: "accessibility", title: "Accessibility Checks", description: "Alt text, lang, ARIA labels." },
  { key: "hreflang", title: "Hreflang Tags", description: "International SEO setup." },
  { key: "favicon", title: "Favicon Detection", description: "Favicon and Apple touch icons." },
  { key: "lazyLoading", title: "Lazy Loading", description: "Image lazy loading." },
  { key: "doctype", title: "Doctype Validation", description: "HTML5 DOCTYPE declaration." },
  { key: "characterEncoding", title: "Character Encoding", description: "UTF-8 encoding." },
  { key: "googlePageSpeed", title: "Google PageSpeed Score", description: "Lighthouse performance scores." },
  { key: "aeo", title: "Answer Engine Optimization (AEO)", description: "Featured snippet readiness." },
  { key: "geo", title: "Generative Engine Optimization (GEO)", description: "AI engine content signals." },
  { key: "programmaticSeo", title: "Programmatic SEO (pSEO)", description: "Template patterns and pagination." },
  { key: "aiSearchVisibility", title: "AI Search Visibility", description: "AI crawler access." },
  { key: "localSeo", title: "Local SEO", description: "LocalBusiness schema and NAP data." },
  { key: "socialMediaMetaTags", title: "Social Media Meta Tags", description: "Social media meta tags for search engines and social platforms." },
  { key: "deprecatedHtmlTags", title: "Deprecated HTML Tags Test", description: "Checks for deprecated HTML tags." },
  { key: "googleAnalytics", title: "Google Analytics Test", description: "Google Analytics tracking detection." },
  { key: "jsErrors", title: "JS Error Test", description: "JavaScript error detection." },
  { key: "consoleErrors", title: "Console Errors Test", description: "Browser console error patterns." },
  { key: "htmlCompression", title: "HTML Compression/GZIP Test", description: "GZIP/Brotli compression check." },
  { key: "htmlPageSize", title: "HTML Page Size Test", description: "HTML document size analysis." },
  { key: "jsExecutionTime", title: "JS Execution Time Test", description: "JavaScript execution time." },
  { key: "cdnUsage", title: "CDN Usage Test", description: "CDN resource delivery check." },
  { key: "modernImageFormats", title: "Modern Image Format Test", description: "WebP/AVIF image format usage." },
];

function renderCardContent(key, result, reportUrl, allResults) {
  if (!result) return null;

  switch (key) {
    case "title":
      return result.title ? (
        <div><strong>{result.title}</strong><br /><small>{result.length} characters</small></div>
      ) : null;

    case "metaDescription":
      return result.description ? (
        <div><em>{result.description}</em><br /><small>{result.length} characters</small></div>
      ) : null;

    case "h1":
      return result.h1Texts && result.h1Texts.length > 0 ? (
        <div>
          {result.h1Texts.map((text, i) => (
            <div key={i}><strong>H1 #{i + 1}:</strong> {text}</div>
          ))}
        </div>
      ) : null;

    case "headingHierarchy":
      return <HeadingTree headings={result.headings} />;

    case "contentAnalysis":
      return result.keywords ? (
        <KeywordAnalysis
          wordCount={result.wordCount}
          keywords={result.keywords}
          twoWordPhrases={result.twoWordPhrases}
          threeWordPhrases={result.threeWordPhrases}
          fourWordPhrases={result.fourWordPhrases}
        />
      ) : null;

    case "googlePageSpeed":
      return result.performanceScore !== null ? (
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          {result.performanceScore !== null && <ScoreGauge value={result.performanceScore} label="Performance" />}
          {result.seoScore !== null && <ScoreGauge value={result.seoScore} label="SEO" />}
          {result.accessibilityScore !== null && <ScoreGauge value={result.accessibilityScore} label="Accessibility" />}
          {result.bestPracticesScore !== null && <ScoreGauge value={result.bestPracticesScore} label="Best Practices" />}
        </div>
      ) : null;

    case "internalLinks":
      return result.links && result.links.length > 0 ? (
        <LinkList links={result.links} baseUrl={reportUrl.replace(/\/$/, "")} showAnchor={true} />
      ) : null;

    case "externalLinks":
      return result.links && result.links.length > 0 ? (
        <LinkList links={result.links} showAnchor={true} />
      ) : null;

    case "openGraph":
      return result.tags && Object.keys(result.tags).length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {Object.entries(result.tags).map(([tag, value]) => (
            <div key={tag} style={{ fontSize: "0.8rem", background: "var(--color-slate-50)", padding: "6px 10px", borderRadius: "var(--radius-sm)", wordBreak: "break-all" }}>
              <strong style={{ color: "var(--color-indigo-700)" }}>{tag}</strong>
              <span style={{ color: "var(--color-slate-600)", marginLeft: "8px" }}>{value || "(empty)"}</span>
            </div>
          ))}
        </div>
      ) : null;

    case "twitterCards":
      return result.tags && Object.keys(result.tags).length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {Object.entries(result.tags).map(([tag, value]) => (
            <div key={tag} style={{ fontSize: "0.8rem", background: "var(--color-slate-50)", padding: "6px 10px", borderRadius: "var(--radius-sm)", wordBreak: "break-all" }}>
              <strong style={{ color: "var(--color-indigo-700)" }}>{tag}</strong>
              <span style={{ color: "var(--color-slate-600)", marginLeft: "8px" }}>{value || "(empty)"}</span>
            </div>
          ))}
        </div>
      ) : null;

    case "socialMediaMetaTags": {
      const ogResult = allResults?.openGraph;
      const twResult = allResults?.twitterCards;
      const hasOgTags = ogResult?.tags && Object.keys(ogResult.tags).length > 0;
      const hasTwTags = twResult?.tags && Object.keys(twResult.tags).length > 0;
      if (!hasOgTags && !hasTwTags) return null;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {hasOgTags && (
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-indigo-700)", display: "block", marginBottom: "6px" }}>
                Open Graph Tags ({Object.keys(ogResult.tags).length})
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {Object.entries(ogResult.tags).map(([tag, value]) => (
                  <div key={tag} style={{ fontSize: "0.78rem", background: "var(--color-slate-50)", padding: "5px 10px", borderRadius: "var(--radius-sm)", wordBreak: "break-all" }}>
                    <strong style={{ color: "var(--color-indigo-700)" }}>{tag}</strong>
                    <span style={{ color: "var(--color-slate-600)", marginLeft: "8px" }}>{value || "(empty)"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasTwTags && (
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-indigo-700)", display: "block", marginBottom: "6px" }}>
                Twitter Card Tags ({Object.keys(twResult.tags).length})
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {Object.entries(twResult.tags).map(([tag, value]) => (
                  <div key={tag} style={{ fontSize: "0.78rem", background: "var(--color-slate-50)", padding: "5px 10px", borderRadius: "var(--radius-sm)", wordBreak: "break-all" }}>
                    <strong style={{ color: "var(--color-indigo-700)" }}>{tag}</strong>
                    <span style={{ color: "var(--color-slate-600)", marginLeft: "8px" }}>{value || "(empty)"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

export default function ReportDetailPage({ params }) {
  const { id } = use(params);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passedExpanded, setPassedExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/reports/${id}`);
      if (!res.ok) {
        setError("Report not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setReport(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <p className={styles.loading}>Loading report...</p>;
  }

  if (error) {
    return (
      <>
        <Link href="/dashboard" className={styles.backLink}>
          &larr; Back to reports
        </Link>
        <div className={styles.error}>{error}</div>
      </>
    );
  }

  const results = report.results_json || {};
  const allCards = ANALYSIS_CONFIG.map((cfg) => ({
    ...cfg,
    score: results[cfg.key]?.score || "pass",
    result: results[cfg.key],
  }));

  const failCards = allCards.filter((c) => c.score === "fail");
  const warningCards = allCards.filter((c) => c.score === "warning");
  const passCards = allCards.filter((c) => c.score === "pass");
  let runningIndex = 0;

  return (
    <>
      <Link href="/dashboard" className={styles.backLink}>
        &larr; Back to reports
      </Link>

      <div className={styles.heroCard}>
        <div className={styles.heroLeft}>
          <OverallScoreGauge value={report.overall_score} />
        </div>
        <div className={styles.heroRight}>
          <h2 className={styles.heroTitle}>SEO Analysis Report</h2>
          <p className={styles.heroUrl}>{report.url}</p>
          <p className={styles.heroMeta}>
            Analyzed on {new Date(report.created_at).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric"
            })}
          </p>
          <div className={styles.severityDots}>
            {report.fail_count > 0 && (
              <span className={styles.dotFail}>{report.fail_count} Critical</span>
            )}
            {report.warning_count > 0 && (
              <span className={styles.dotWarning}>{report.warning_count} Warnings</span>
            )}
            {report.pass_count > 0 && (
              <span className={styles.dotPass}>{report.pass_count} Passed</span>
            )}
          </div>
          <button className={styles.shareBtn} onClick={handleShare} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            {copied ? "Link Copied!" : "Share Report"}
          </button>
        </div>
      </div>

      <GSCDataPanel url={report.url} />

      {failCards.length > 0 && (
        <div className={styles.severitySection}>
          <h3 className={`${styles.sectionHeader} ${styles.sectionHeaderFail}`}>
            Critical Issues ({failCards.length})
          </h3>
          {failCards.map((card) => {
            runningIndex++;
            return (
              <AnalysisCard
                key={card.key}
                title={card.title}
                description={card.description}
                score={card.result?.score || "fail"}
                issues={card.result?.issues}
                recommendations={card.result?.recommendations}
                index={runningIndex}
                defaultExpanded={true}
              >
                {renderCardContent(card.key, card.result, report.url, results)}
              </AnalysisCard>
            );
          })}
        </div>
      )}

      {warningCards.length > 0 && (
        <div className={styles.severitySection}>
          <h3 className={`${styles.sectionHeader} ${styles.sectionHeaderWarning}`}>
            Warnings ({warningCards.length})
          </h3>
          {warningCards.map((card) => {
            runningIndex++;
            return (
              <AnalysisCard
                key={card.key}
                title={card.title}
                description={card.description}
                score={card.result?.score || "warning"}
                issues={card.result?.issues}
                recommendations={card.result?.recommendations}
                index={runningIndex}
                defaultExpanded={true}
              >
                {renderCardContent(card.key, card.result, report.url, results)}
              </AnalysisCard>
            );
          })}
        </div>
      )}

      {passCards.length > 0 && (
        <div className={styles.severitySection}>
          <button
            className={`${styles.sectionHeader} ${styles.sectionHeaderPass} ${styles.collapseToggle}`}
            onClick={() => setPassedExpanded(!passedExpanded)}
            type="button"
            aria-expanded={passedExpanded}
          >
            Passed Checks ({passCards.length})
            <span className={`${styles.toggleChevron} ${passedExpanded ? styles.toggleChevronOpen : ""}`}>
              &#8250;
            </span>
          </button>
          {passedExpanded &&
            passCards.map((card) => {
              runningIndex++;
              return (
                <AnalysisCard
                  key={card.key}
                  title={card.title}
                  description={card.description}
                  score={card.result?.score || "pass"}
                  issues={card.result?.issues}
                  recommendations={card.result?.recommendations}
                  index={runningIndex}
                  defaultExpanded={false}
                >
                  {renderCardContent(card.key, card.result, report.url, results)}
                </AnalysisCard>
              );
            })}
        </div>
      )}
    </>
  );
}

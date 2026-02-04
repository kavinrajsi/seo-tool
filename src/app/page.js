"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import AnalysisCard from "./components/AnalysisCard";
import HeadingTree from "./components/HeadingTree";
import ScoreGauge from "./components/ScoreGauge";
import OverallScoreGauge from "./components/OverallScoreGauge";
import SerpPreview from "./components/SerpPreview";
import KeywordAnalysis from "./components/KeywordAnalysis";
import LinkList from "./components/LinkList";
import Navbar from "./components/Navbar";
import BulkScanForm from "./components/BulkScanForm";
import BulkScanResults from "./components/BulkScanResults";
import BulkScanDetail from "./components/BulkScanDetail";
import FullScanForm from "./components/FullScanForm";
import SitemapCreatorForm from "./components/SitemapCreatorForm";
import useBulkScan from "./hooks/useBulkScan";
import useFullScan from "./hooks/useFullScan";
import { useAuth } from "./components/AuthProvider";
import Link from "next/link";
import {
  cacheAnalysisResult,
  getCachedAnalysisResult,
  cleanupExpiredCache,
  clearCachedResult,
  getCacheTimeRemaining
} from "@/lib/cache";

const ANALYSIS_CONFIG = [
  {
    key: "title",
    title: "Title Tag Analysis",
    description:
      "We check length, keyword placement, and truncation issues. Your title is the #1 on-page factor.",
  },
  {
    key: "metaDescription",
    title: "Meta Description",
    description:
      "Analyze description length and quality. A compelling meta description increases click-through rates.",
  },
  {
    key: "h1",
    title: "H1 Structure",
    description:
      "Verify you have exactly one H1 tag with your primary keyword. Essential for content hierarchy.",
  },
  {
    key: "headingHierarchy",
    title: "Heading Hierarchy",
    description:
      "Verify proper H1-H6 structure. Logical heading order improves SEO and accessibility.",
  },
  {
    key: "metaRobots",
    title: "Meta Robots",
    description:
      "Check for noindex/nofollow directives that might block search engines from your content.",
  },
  {
    key: "sslHttps",
    title: "SSL/HTTPS Check",
    description:
      "Verify secure connection. HTTPS is required for modern SEO and user trust.",
  },
  {
    key: "canonicalUrl",
    title: "Canonical URL",
    description:
      "Check canonical tag configuration. Prevents duplicate content issues and clarifies preferred URLs.",
  },
  {
    key: "mobileResponsiveness",
    title: "Mobile Responsiveness",
    description:
      "Check viewport configuration and mobile-friendliness. Google prioritizes mobile-optimized sites.",
  },
  {
    key: "pageSpeed",
    title: "Page Speed Analysis",
    description:
      "Analyze page size and load performance. Fast pages rank higher and provide better user experience.",
  },
  {
    key: "imageOptimization",
    title: "Image Optimization",
    description:
      "Check for missing alt text and outdated formats. Images impact both SEO and page speed.",
  },
  {
    key: "internalLinks",
    title: "Internal Links",
    description:
      "Count and analyze internal linking. Good internal links help Google discover and rank your pages.",
  },
  {
    key: "externalLinks",
    title: "External Links",
    description:
      "Analyze outbound links and nofollow usage. External links to authority sites boost credibility.",
  },
  {
    key: "schemaMarkup",
    title: "Schema Markup",
    description:
      "Detect JSON-LD structured data. Schema can enable rich snippets in search results.",
  },
  {
    key: "openGraph",
    title: "Open Graph Tags",
    description:
      "Analyze social media optimization. Complete OG tags improve appearance when shared.",
  },
  {
    key: "twitterCards",
    title: "Twitter Cards",
    description:
      "Check Twitter/X card meta tags for optimal social sharing appearance on the platform.",
  },
  {
    key: "socialImageSize",
    title: "Social Image Size",
    description:
      "Verify OG/Twitter image dimensions. Properly sized images look better when shared.",
  },
  {
    key: "contentAnalysis",
    title: "Content Analysis",
    description:
      "Analyze word count, readability, and content quality. Comprehensive content ranks better.",
  },
  {
    key: "urlStructure",
    title: "URL Structure",
    description:
      "Check URL format and SEO-friendliness. Clean URLs are easier for users and search engines.",
  },
  {
    key: "keywordsInUrl",
    title: "Keywords in URL",
    description:
      "Check if URL contains relevant keywords from title. Keyword-rich URLs aid SEO.",
  },
  {
    key: "sitemapDetection",
    title: "Sitemap Detection",
    description:
      "Check for XML sitemap presence. Sitemaps help search engines discover all your pages.",
  },
  {
    key: "accessibility",
    title: "Accessibility Checks",
    description:
      "Basic accessibility analysis including alt text, lang attributes, and ARIA labels.",
  },
  {
    key: "hreflang",
    title: "Hreflang Tags",
    description:
      "Verify international SEO setup. Hreflang helps serve the right language to users.",
  },
  {
    key: "favicon",
    title: "Favicon Detection",
    description:
      "Check for favicon and Apple touch icons. Proper branding across browsers and bookmarks.",
  },
  {
    key: "lazyLoading",
    title: "Lazy Loading",
    description:
      "Analyze image lazy loading implementation. Improves page speed and Core Web Vitals.",
  },
  {
    key: "doctype",
    title: "Doctype Validation",
    description:
      "Verify HTML5 DOCTYPE declaration. Ensures proper browser rendering mode.",
  },
  {
    key: "characterEncoding",
    title: "Character Encoding",
    description:
      "Check UTF-8 encoding declaration. Prevents character display issues across languages.",
  },
  {
    key: "googlePageSpeed",
    title: "Google PageSpeed Score",
    description:
      "Live performance scores from Google Lighthouse. Measures Core Web Vitals, SEO, accessibility, and best practices.",
  },
  {
    key: "aeo",
    title: "Answer Engine Optimization (AEO)",
    description:
      "Checks for FAQ schema, question headings, lists, and tables that make content eligible for featured snippets and direct answers.",
  },
  {
    key: "geo",
    title: "Generative Engine Optimization (GEO)",
    description:
      "Analyzes content signals that AI engines (ChatGPT, Gemini, Perplexity) use: author info, citations, data points, and topic depth.",
  },
  {
    key: "programmaticSeo",
    title: "Programmatic SEO (pSEO)",
    description:
      "Detects template patterns, pagination, URL structures, and schema that indicate programmatic page generation at scale.",
  },
  {
    key: "aiSearchVisibility",
    title: "AI Search Visibility",
    description:
      "Checks if AI crawlers (GPTBot, Google-Extended, ClaudeBot, PerplexityBot) can access your content and extract structured data.",
  },
  {
    key: "localSeo",
    title: "Local SEO",
    description:
      "Analyzes LocalBusiness schema, NAP data, Google Maps embeds, geo coordinates, opening hours, and local keywords.",
  },
  {
    key: "socialMediaMetaTags",
    title: "Social Media Meta Tags",
    description:
      "Checks whether the page includes social media meta tags (Open Graph, Twitter Cards, article metadata) used by search engines and social platforms.",
  },
  {
    key: "deprecatedHtmlTags",
    title: "Deprecated HTML Tags Test",
    description:
      "Checks if the page uses deprecated HTML tags (font, center, marquee, etc.) that should be replaced with modern CSS.",
  },
  {
    key: "googleAnalytics",
    title: "Google Analytics Test",
    description:
      "Detects Google Analytics (GA4), Universal Analytics, and Google Tag Manager tracking codes on the page.",
  },
  {
    key: "jsErrors",
    title: "JS Error Test",
    description:
      "Static analysis for potential JavaScript issues including mixed content scripts, eval usage, and empty script sources.",
  },
  {
    key: "consoleErrors",
    title: "Console Errors Test",
    description:
      "Checks for common issues that cause browser console errors: mixed content, duplicate IDs, broken resources.",
  },
  {
    key: "htmlCompression",
    title: "HTML Compression/GZIP Test",
    description:
      "Checks if the server uses GZIP or Brotli compression to reduce HTML transfer size.",
  },
  {
    key: "htmlPageSize",
    title: "HTML Page Size Test",
    description:
      "Analyzes the total HTML document size and its impact on page load performance.",
  },
  {
    key: "jsExecutionTime",
    title: "JS Execution Time Test",
    description:
      "Measures JavaScript execution time, Total Blocking Time, and main thread work via Google Lighthouse.",
  },
  {
    key: "cdnUsage",
    title: "CDN Usage Test",
    description:
      "Checks if static resources (scripts, stylesheets, images) are served through a Content Delivery Network.",
  },
  {
    key: "modernImageFormats",
    title: "Modern Image Format Test",
    description:
      "Checks if images use modern formats (WebP, AVIF) for better compression and faster loading.",
  },
];

function computeOverallScore(results) {
  const keys = ANALYSIS_CONFIG.map((c) => c.key);
  let total = 0;
  let count = 0;
  for (const key of keys) {
    const result = results[key];
    if (!result) continue;
    count++;
    if (result.score === "pass") total += 100;
    else if (result.score === "warning") total += 50;
    // fail = 0
  }
  return count > 0 ? Math.round(total / count) : 0;
}

export default function Home() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [passedExpanded, setPassedExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState("");
  const [scanMode, setScanMode] = useState("single");
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [savedReportId, setSavedReportId] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadError, setLeadError] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const resultsRef = useRef(null);
  const progressRef = useRef(null);
  const toastTimerRef = useRef(null);
  const pendingActionRef = useRef(null);
  const bulkScan = useBulkScan();
  const fullScan = useFullScan();

  // Sitemap creator state
  const [sitemapDomain, setSitemapDomain] = useState("");
  const [sitemapDiscovering, setSitemapDiscovering] = useState(false);
  const [sitemapUrls, setSitemapUrls] = useState([]);
  const [sitemapSelectedUrls, setSitemapSelectedUrls] = useState(new Set());
  const [sitemapUrlConfig, setSitemapUrlConfig] = useState({});
  const [sitemapError, setSitemapError] = useState("");
  const [sitemapGeneratedXml, setSitemapGeneratedXml] = useState("");
  const [sitemapCrawlMethod, setSitemapCrawlMethod] = useState("sitemap");

  const startProgress = useCallback(() => {
    setProgress(0);
    let value = 0;
    clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      // Fast at first, slows down approaching 90%
      const remaining = 90 - value;
      const increment = Math.max(0.3, remaining * 0.04);
      value = Math.min(90, value + increment);
      setProgress(Math.round(value));
    }, 200);
  }, []);

  const stopProgress = useCallback(() => {
    clearInterval(progressRef.current);
    setProgress(100);
  }, []);

  useEffect(() => {
    return () => clearInterval(progressRef.current);
  }, []);

  // Cleanup expired cache on mount
  useEffect(() => {
    cleanupExpiredCache();
  }, []);

  // Check if lead data exists in localStorage
  function getLeadData() {
    try {
      const stored = localStorage.getItem("seo_lead");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Require login or lead capture before proceeding
  function requireAuth(action) {
    if (user) return true;
    if (getLeadData()) return true;
    pendingActionRef.current = action;
    setShowLeadCapture(true);
    return false;
  }

  // Handle lead form submission
  async function handleLeadSubmit(e) {
    e.preventDefault();
    setLeadError("");

    if (!leadName.trim() || !leadEmail.trim()) {
      setLeadError("Please fill in all fields.");
      return;
    }

    setLeadSubmitting(true);

    // Store lead in database
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: leadName.trim(),
          email: leadEmail.trim(),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setLeadError(json.error || "Failed to save. Please try again.");
        setLeadSubmitting(false);
        return;
      }
    } catch {
      setLeadError("Network error. Please try again.");
      setLeadSubmitting(false);
      return;
    }

    // Save to localStorage
    localStorage.setItem(
      "seo_lead",
      JSON.stringify({ fullName: leadName.trim(), email: leadEmail.trim() })
    );

    setLeadSubmitting(false);
    setShowLeadCapture(false);

    // Execute the pending action (triggers the analysis)
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action();
    }
  }

  async function handleSubmit(e, forceRefresh = false) {
    e?.preventDefault();
    if (!url.trim()) return;

    if (!requireAuth(() => handleSubmit(null, forceRefresh))) return;

    // Check cache first (unless forceRefresh is true)
    if (!forceRefresh) {
      const cached = getCachedAnalysisResult(url.trim());
      if (cached) {
        setData(cached);
        setIsCachedResult(true);
        setError("");
        showToast("Loaded from cache");
        return;
      }
    }

    setLoading(true);
    setError("");
    setData(null);
    setIsCachedResult(false);
    setPassedExpanded(false);
    startProgress();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Something went wrong");
        return;
      }

      setData(json);
      setIsCachedResult(false);

      // Cache the result for 24 hours
      cacheAnalysisResult(url.trim(), json);

      // Auto-save report
      try {
        const lead = getLeadData();
        const saveRes = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: json.url,
            results: json.results,
            loadTimeMs: json.loadTimeMs,
            contentLength: json.contentLength,
            leadEmail: lead?.email || null,
          }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          setSavedReportId(saved.id || null);
          showToast("Report saved to dashboard");
        }
      } catch {
        // Silent fail — don't block the user
      }
    } catch {
      setError("Failed to connect. Please check your internet connection.");
    } finally {
      stopProgress();
      setLoading(false);
    }
  }

  // Force a fresh analysis (bypass cache)
  function handleReAnalyze() {
    handleSubmit(null, true);
  }

  async function handleDownloadPdf() {
    if (!resultsRef.current) return;

    setDownloading(true);
    // Temporarily expand passed section for PDF capture
    const wasExpanded = passedExpanded;
    setPassedExpanded(true);

    // Wait for React to re-render
    await new Promise((r) => setTimeout(r, 100));

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(resultsRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#f5f7fa",
        ignoreElements: (el) => el.tagName === "IMG" && el.src?.includes("google.com/s2/favicons"),
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageHeight = pdf.internal.pageSize.getHeight();
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);

      let remainingHeight = imgHeight - (pageHeight - 20);
      while (remainingHeight > 0) {
        position = position - pageHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        remainingHeight -= pageHeight - 20;
      }

      const domain = new URL(data.url).hostname;
      const ts = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
      pdf.save(`seo-report-${domain}-${ts}.pdf`);
    } catch {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      if (!wasExpanded) {
        setPassedExpanded(false);
      }
      setDownloading(false);
    }
  }

  function handleDownloadMarkdown() {
    if (!data) return;

    const scoreLabel = (s) =>
      s === "fail" ? "FAIL" : s === "warning" ? "WARNING" : "PASS";

    const lines = [];
    lines.push(`# SEO Analysis Report`);
    lines.push("");
    lines.push(`**URL:** ${data.url}`);
    lines.push(`**Overall Score:** ${overallScore}/100`);
    lines.push(`**Summary:** ${getSummaryText()}`);
    lines.push("");

    function appendCards(heading, cards) {
      if (cards.length === 0) return;
      lines.push(`## ${heading}`);
      lines.push("");
      for (const card of cards) {
        const r = card.result;
        lines.push(`### ${card.title} \u2014 ${scoreLabel(card.score)}`);
        lines.push("");
        lines.push(card.description);
        lines.push("");
        if (r?.issues?.length) {
          lines.push("**Findings:**");
          for (const issue of r.issues) {
            lines.push(`- ${issue}`);
          }
          lines.push("");
        }
        if (r?.recommendations?.length) {
          lines.push("**How to Fix:**");
          for (const rec of r.recommendations) {
            lines.push(`- ${rec}`);
          }
          lines.push("");
        }
      }
    }

    appendCards(`Critical Issues (${counts.fail})`, failCards);
    appendCards(`Warnings (${counts.warning})`, warningCards);
    appendCards(`Passed Checks (${counts.pass})`, passCards);

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const domain = new URL(data.url).hostname;
    const ts = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
    a.href = url;
    a.download = `seo-report-${domain}-${ts}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildReportText() {
    const scoreLabel = (s) =>
      s === "fail" ? "FAIL" : s === "warning" ? "WARNING" : "PASS";

    const lines = [];
    lines.push(`SEO Analysis Report`);
    lines.push(`URL: ${data.url}`);
    lines.push(`Overall Score: ${overallScore}/100`);
    lines.push(`Summary: ${getSummaryText()}`);
    lines.push("");

    function appendCards(heading, cards) {
      if (cards.length === 0) return;
      lines.push(heading);
      for (const card of cards) {
        const r = card.result;
        lines.push(`\n${card.title} — ${scoreLabel(card.score)}`);
        if (r?.issues?.length) {
          lines.push("Findings:");
          for (const issue of r.issues) lines.push(`- ${issue}`);
        }
        if (r?.recommendations?.length) {
          lines.push("How to Fix:");
          for (const rec of r.recommendations) lines.push(`- ${rec}`);
        }
      }
      lines.push("");
    }

    appendCards(`Critical Issues (${counts.fail})`, failCards);
    appendCards(`Warnings (${counts.warning})`, warningCards);
    appendCards(`Passed Checks (${counts.pass})`, passCards);

    return lines.join("\n");
  }

  function showToast(message) {
    clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(""), 3000);
  }

  async function handleSummarizeWithChatGPT() {
    if (!data) return;
    const report = buildReportText();
    const prompt = `Please summarize the following SEO analysis report. Highlight the most critical issues, key strengths, and provide a prioritized action plan:\n\n${report}`;
    try {
      await navigator.clipboard.writeText(prompt);
      showToast("Prompt copied! Opening ChatGPT — paste it there.");
    } catch {
      showToast("Could not copy to clipboard.");
    }
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
  }

  function renderCardContent(key, result) {
    if (!result) return null;

    switch (key) {
      case "title":
        return result.title ? (
          <div>
            <strong>{result.title}</strong>
            <br />
            <small>{result.length} characters</small>
          </div>
        ) : null;

      case "metaDescription":
        return result.description ? (
          <div>
            <em>{result.description}</em>
            <br />
            <small>{result.length} characters</small>
          </div>
        ) : null;

      case "h1":
        return result.h1Texts && result.h1Texts.length > 0 ? (
          <div>
            {result.h1Texts.map((text, i) => (
              <div key={i}>
                <strong>H1 #{i + 1}:</strong> {text}
              </div>
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

      case "imageOptimization":
        return result.missingAltImages && result.missingAltImages.length > 0 ? (
          <div>
            <strong style={{ fontSize: "0.85rem", color: "var(--color-fail-text)" }}>
              Image Alt Missing
            </strong>
            <p style={{ fontSize: "0.8rem", color: "var(--color-slate-600)", margin: "4px 0 8px" }}>
              Some images on your page have no alt attribute.
            </p>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
              {result.missingAltImages.map((src, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-slate-600)",
                    background: "var(--color-slate-50)",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    wordBreak: "break-all",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-fail)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  {src || "(empty src)"}
                </li>
              ))}
            </ul>
          </div>
        ) : null;

      case "googlePageSpeed":
        return result.performanceScore !== null ? (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            {result.performanceScore !== null && (
              <ScoreGauge value={result.performanceScore} label="Performance" />
            )}
            {result.seoScore !== null && (
              <ScoreGauge value={result.seoScore} label="SEO" />
            )}
            {result.accessibilityScore !== null && (
              <ScoreGauge value={result.accessibilityScore} label="Accessibility" />
            )}
            {result.bestPracticesScore !== null && (
              <ScoreGauge value={result.bestPracticesScore} label="Best Practices" />
            )}
          </div>
        ) : null;

      case "sitemapDetection":
        return result.sitemapUrls && result.sitemapUrls.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {result.sitemapUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-indigo-600)",
                  wordBreak: "break-all",
                }}
              >
                {url}
              </a>
            ))}
          </div>
        ) : result.sitemapUrl ? (
          <div>
            <a
              href={result.sitemapUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.8rem",
                color: "var(--color-indigo-600)",
                wordBreak: "break-all",
              }}
            >
              {result.sitemapUrl}
            </a>
          </div>
        ) : null;

      case "internalLinks":
        return result.links && result.links.length > 0 ? (
          <LinkList links={result.links} baseUrl={data.url.replace(/\/$/, "")} showAnchor={true} />
        ) : null;

      case "externalLinks":
        return result.links && result.links.length > 0 ? (
          <LinkList links={result.links} showAnchor={true} />
        ) : null;

      case "aeo":
        return result.signals && result.signals.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {result.signals.map((s, i) => (
              <span key={i} style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-indigo-50)",
                color: "var(--color-indigo-700)",
              }}>{s}</span>
            ))}
          </div>
        ) : null;

      case "geo":
        return result.signals && result.signals.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {result.signals.map((s, i) => (
              <span key={i} style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-indigo-50)",
                color: "var(--color-indigo-700)",
              }}>{s}</span>
            ))}
          </div>
        ) : null;

      case "programmaticSeo":
        return result.signals && result.signals.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {result.signals.map((s, i) => (
              <span key={i} style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-slate-100)",
                color: "var(--color-slate-700)",
              }}>{s}</span>
            ))}
          </div>
        ) : null;

      case "aiSearchVisibility":
        return (result.blockedBots?.length > 0 || result.allowedBots?.length > 0 || result.signals?.length > 0) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {result.blockedBots?.length > 0 && (
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-fail-text)", display: "block", marginBottom: "4px" }}>Blocked Crawlers</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {result.blockedBots.map((b, i) => (
                    <span key={i} style={{
                      fontSize: "0.75rem", fontWeight: 600, padding: "3px 8px",
                      borderRadius: "var(--radius-sm)", background: "var(--color-fail-light)", color: "var(--color-fail-text)",
                    }}>{b}</span>
                  ))}
                </div>
              </div>
            )}
            {result.signals && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {result.signals.filter(s => !s.includes("blocked")).map((s, i) => (
                  <span key={i} style={{
                    fontSize: "0.75rem", fontWeight: 600, padding: "3px 8px",
                    borderRadius: "var(--radius-sm)", background: "var(--color-pass-light)", color: "var(--color-pass-text)",
                  }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        ) : null;

      case "openGraph":
        return result.tags && Object.keys(result.tags).length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Object.entries(result.tags).map(([tag, value]) => (
              <div key={tag} style={{
                fontSize: "0.8rem",
                background: "var(--color-slate-50)",
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                wordBreak: "break-all",
              }}>
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
              <div key={tag} style={{
                fontSize: "0.8rem",
                background: "var(--color-slate-50)",
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                wordBreak: "break-all",
              }}>
                <strong style={{ color: "var(--color-indigo-700)" }}>{tag}</strong>
                <span style={{ color: "var(--color-slate-600)", marginLeft: "8px" }}>{value || "(empty)"}</span>
              </div>
            ))}
          </div>
        ) : null;

      case "socialMediaMetaTags": {
        const ogResult = data?.results?.openGraph;
        const twResult = data?.results?.twitterCards;
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
                    <div key={tag} style={{
                      fontSize: "0.78rem",
                      background: "var(--color-slate-50)",
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      wordBreak: "break-all",
                    }}>
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
                    <div key={tag} style={{
                      fontSize: "0.78rem",
                      background: "var(--color-slate-50)",
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      wordBreak: "break-all",
                    }}>
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

      case "localSeo":
        return result.signals && result.signals.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {result.signals.map((s, i) => (
              <span key={i} style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-pass-light)",
                color: "var(--color-pass-text)",
              }}>{s}</span>
            ))}
          </div>
        ) : null;

      default:
        return null;
    }
  }

  // Build grouped card arrays
  const allCards = data
    ? ANALYSIS_CONFIG.map((cfg) => ({
        ...cfg,
        score: data.results[cfg.key]?.score || "pass",
        result: data.results[cfg.key],
      }))
    : [];

  const failCards = allCards.filter((c) => c.score === "fail");
  const warningCards = allCards.filter((c) => c.score === "warning");
  const passCards = allCards.filter((c) => c.score === "pass");

  const counts = {
    fail: failCards.length,
    warning: warningCards.length,
    pass: passCards.length,
  };

  const overallScore = data ? computeOverallScore(data.results) : 0;

  // Sequential numbering across severity groups
  let runningIndex = 0;

  function getSummaryText() {
    const parts = [];
    if (counts.fail > 0) parts.push(`${counts.fail} critical issue${counts.fail > 1 ? "s" : ""}`);
    if (counts.warning > 0) parts.push(`${counts.warning} warning${counts.warning > 1 ? "s" : ""}`);
    if (counts.pass > 0) parts.push(`${counts.pass} passed`);
    return parts.join(", ");
  }

  const hasBulkResults = scanMode === "bulk" && bulkScan.scanItems.length > 0;
  const hasFullResults = scanMode === "full" && fullScan.scanItems.length > 0;
  const hasSitemapResults = scanMode === "sitemap" && sitemapGeneratedXml !== "";
  const showLanding = !data && !loading && !hasBulkResults && !hasFullResults && !hasSitemapResults;

  const bulkExpandedItem = bulkScan.scanItems.find(
    (item) => item.url === bulkScan.expandedUrl && item.status === "done"
  );

  const fullExpandedItem = fullScan.scanItems.find(
    (item) => item.url === fullScan.expandedUrl && item.status === "done"
  );

  // Sitemap creator handlers
  const handleSitemapDiscoverUrls = async () => {
    if (!requireAuth(() => handleSitemapDiscoverUrls())) return;
    if (!sitemapDomain.trim()) {
      setSitemapError("Please enter a domain");
      return;
    }

    setSitemapDiscovering(true);
    setSitemapError("");
    setSitemapUrls([]);
    setSitemapSelectedUrls(new Set());
    setSitemapUrlConfig({});
    setSitemapGeneratedXml("");

    try {
      if (sitemapCrawlMethod === "sitemap") {
        const response = await fetch("/api/sitemap-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: sitemapDomain }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch sitemap");
        }

        const data = await response.json();
        setSitemapUrls(data.urls || []);
        setSitemapSelectedUrls(new Set(data.urls || []));

        const config = {};
        (data.urls || []).forEach((url) => {
          config[url] = {
            changefreq: "weekly",
            priority: "0.5",
            lastmod: new Date().toISOString().split('T')[0],
          };
        });
        setSitemapUrlConfig(config);
      } else {
        const response = await fetch("/api/sitemap-creator/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: sitemapDomain, maxPages: 100 }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to crawl site");
        }

        const data = await response.json();
        setSitemapUrls(data.urls || []);
        setSitemapSelectedUrls(new Set(data.urls || []));

        const config = {};
        (data.urls || []).forEach((url) => {
          config[url] = {
            changefreq: "weekly",
            priority: "0.5",
            lastmod: new Date().toISOString().split('T')[0],
          };
        });
        setSitemapUrlConfig(config);
      }
    } catch (err) {
      setSitemapError(err.message);
    } finally {
      setSitemapDiscovering(false);
    }
  };

  const handleSitemapToggleUrl = (url) => {
    const newSelected = new Set(sitemapSelectedUrls);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSitemapSelectedUrls(newSelected);
  };

  const handleSitemapSelectAll = () => {
    setSitemapSelectedUrls(new Set(sitemapUrls));
  };

  const handleSitemapDeselectAll = () => {
    setSitemapSelectedUrls(new Set());
  };

  const handleSitemapUpdateConfig = (url, field, value) => {
    setSitemapUrlConfig((prev) => ({
      ...prev,
      [url]: {
        ...prev[url],
        [field]: value,
      },
    }));
  };

  const handleSitemapGenerate = () => {
    if (sitemapSelectedUrls.size === 0) {
      setSitemapError("Please select at least one URL");
      return;
    }

    const urlsArray = Array.from(sitemapSelectedUrls);
    const urlEntries = urlsArray
      .map((url) => {
        const config = sitemapUrlConfig[url] || {};
        return `  <url>
    <loc>${url}</loc>
    <lastmod>${config.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${config.changefreq || "weekly"}</changefreq>
    <priority>${config.priority || "0.5"}</priority>
  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    setSitemapGeneratedXml(xml);
  };

  const handleSitemapDownload = () => {
    if (!sitemapGeneratedXml) return;

    const blob = new Blob([sitemapGeneratedXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <Navbar />

      {/* ── Hero Section ── */}
      <header className={styles.hero}>
        <div className={styles.heroBadge}>Free SEO Analysis Tool</div>
        <h1 className={styles.heroHeadline}>
          Stop Losing Traffic to<br />
          <span className={styles.heroAccent}>Hidden SEO Problems</span>
        </h1>
        <p className={styles.heroSub}>
          Most websites have critical SEO issues they don&apos;t know about. Analyze 33 on-page
          factors in seconds — from meta tags to AI search readiness — and get
          actionable fixes to rank higher.
        </p>
        <div className={styles.heroTrust}>
          <span className={styles.trustItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            33 checks
          </span>
          <span className={styles.trustItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Instant results
          </span>
          <span className={styles.trustItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Free to use
          </span>
        </div>
      </header>

      {/* ── Search Bar (always visible) ── */}
      <section className={styles.searchSection}>
        <div className={styles.scanTabs}>
          <button
            type="button"
            className={`${styles.scanTab} ${scanMode === "single" ? styles.scanTabActive : ""}`}
            onClick={() => setScanMode("single")}
          >
            Single URL
          </button>
          <button
            type="button"
            className={`${styles.scanTab} ${scanMode === "bulk" ? styles.scanTabActive : ""}`}
            onClick={() => setScanMode("bulk")}
          >
            Bulk Scan
          </button>
          <button
            type="button"
            className={`${styles.scanTab} ${scanMode === "full" ? styles.scanTabActive : ""}`}
            onClick={() => setScanMode("full")}
          >
            Full Scan
          </button>
          <button
            type="button"
            className={`${styles.scanTab} ${scanMode === "sitemap" ? styles.scanTabActive : ""}`}
            onClick={() => setScanMode("sitemap")}
          >
            Sitemap Creator
          </button>
        </div>

        {scanMode === "single" ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.input}
                placeholder="Enter website URL (e.g., example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className={styles.button}
                disabled={loading || !url.trim()}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </form>
        ) : scanMode === "bulk" ? (
          <BulkScanForm
            urls={bulkScan.urls}
            setUrls={bulkScan.setUrls}
            urlCount={bulkScan.urlCount}
            maxUrls={bulkScan.maxUrls}
            scanning={bulkScan.scanning}
            error={bulkScan.error}
            onScan={() => {
              if (!requireAuth(() => bulkScan.startBulkScan())) return;
              bulkScan.startBulkScan();
            }}
            onCancel={bulkScan.cancelScan}
          />
        ) : scanMode === "full" ? (
          <FullScanForm
            domain={fullScan.domain}
            setDomain={fullScan.setDomain}
            fetchingUrls={fullScan.fetchingUrls}
            totalUrls={fullScan.totalUrls}
            sitemapCount={fullScan.sitemapCount}
            scanning={fullScan.scanning}
            error={fullScan.error}
            onFetchSitemap={() => {
              if (!requireAuth(() => fullScan.fetchSitemapUrls())) return;
              fullScan.fetchSitemapUrls();
            }}
            onStartScan={() => {
              if (!requireAuth(() => fullScan.startFullScan())) return;
              fullScan.startFullScan();
            }}
            onCancel={fullScan.cancelScan}
          />
        ) : (
          <SitemapCreatorForm
            domain={sitemapDomain}
            setDomain={setSitemapDomain}
            crawlMethod={sitemapCrawlMethod}
            setCrawlMethod={setSitemapCrawlMethod}
            discovering={sitemapDiscovering}
            urls={sitemapUrls}
            selectedUrls={sitemapSelectedUrls}
            urlConfig={sitemapUrlConfig}
            error={sitemapError}
            generatedXml={sitemapGeneratedXml}
            onDiscoverUrls={handleSitemapDiscoverUrls}
            onToggleUrl={handleSitemapToggleUrl}
            onSelectAll={handleSitemapSelectAll}
            onDeselectAll={handleSitemapDeselectAll}
            onUpdateConfig={handleSitemapUpdateConfig}
            onGenerateSitemap={handleSitemapGenerate}
            onDownloadSitemap={handleSitemapDownload}
          />
        )}
      </section>

      {/* ── Landing Sections (hidden once results load) ── */}
      {showLanding && !error && (
        <>
          {/* Problem */}
          <section className={styles.problemSection}>
            <h2 className={styles.sectionHeading}>
              Why most websites <span className={styles.heroAccent}>fail</span> at SEO
            </h2>
            <p className={styles.sectionSub}>
              Search engines evaluate hundreds of signals. Missing even one can tank your rankings.
            </p>
            <div className={styles.problemGrid}>
              <div className={styles.problemCard}>
                <div className={styles.problemIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h3 className={styles.problemTitle}>Invisible issues kill rankings</h3>
                <p className={styles.problemText}>
                  Broken meta tags, missing schema, and crawl blocks silently prevent Google from ranking your pages.
                </p>
              </div>
              <div className={styles.problemCard}>
                <div className={styles.problemIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <h3 className={styles.problemTitle}>Manual audits waste hours</h3>
                <p className={styles.problemText}>
                  Checking every tag, link, and image by hand is slow and error-prone. Automation catches what you miss.
                </p>
              </div>
              <div className={styles.problemCard}>
                <div className={styles.problemIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20 12a8 8 0 1 1-8-8"/></svg>
                </div>
                <h3 className={styles.problemTitle}>AI search demands new signals</h3>
                <p className={styles.problemText}>
                  ChatGPT, Gemini, and Perplexity use different ranking signals. Traditional SEO alone isn&apos;t enough anymore.
                </p>
              </div>
            </div>
          </section>

          {/* What We Analyze */}
          <section className={styles.featuresSection}>
            <h2 className={styles.sectionHeading}>
              33 checks across <span className={styles.heroAccent}>6 categories</span>
            </h2>
            <p className={styles.sectionSub}>
              Every factor that affects your search visibility, analyzed in one scan.
            </p>
            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <h3 className={styles.featureTitle}>On-Page Essentials</h3>
                <p className={styles.featureText}>Title tags, meta descriptions, headings, canonical URLs, robots directives</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/></svg>
                </div>
                <h3 className={styles.featureTitle}>Technical SEO</h3>
                <p className={styles.featureText}>SSL, page speed, mobile responsiveness, sitemaps, doctype</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
                <h3 className={styles.featureTitle}>Content &amp; Media</h3>
                <p className={styles.featureText}>Word count, readability, keyword density, image alt text, lazy loading</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <h3 className={styles.featureTitle}>Links &amp; Structure</h3>
                <p className={styles.featureText}>Internal links, external links, URL structure, keywords in URL, hreflang</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <h3 className={styles.featureTitle}>Social &amp; Rich Results</h3>
                <p className={styles.featureText}>Open Graph, Twitter Cards, social images, schema markup, SERP preview</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3 className={styles.featureTitle}>AI &amp; Next-Gen SEO</h3>
                <p className={styles.featureText}>AEO, GEO, pSEO, AI crawler access, local SEO, Google PageSpeed scores</p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className={styles.howSection}>
            <h2 className={styles.sectionHeading}>
              How it <span className={styles.heroAccent}>works</span>
            </h2>
            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <span className={styles.stepNumber}>1</span>
                <h3 className={styles.stepTitle}>Enter your URL</h3>
                <p className={styles.stepText}>
                  Sign up for free and paste any webpage URL into the analyzer.
                </p>
              </div>
              <div className={styles.stepArrow}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
              <div className={styles.stepCard}>
                <span className={styles.stepNumber}>2</span>
                <h3 className={styles.stepTitle}>Get instant analysis</h3>
                <p className={styles.stepText}>
                  We scan 33 SEO factors and score each one as pass, warning, or critical.
                </p>
              </div>
              <div className={styles.stepArrow}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
              <div className={styles.stepCard}>
                <span className={styles.stepNumber}>3</span>
                <h3 className={styles.stepTitle}>Fix and rank higher</h3>
                <p className={styles.stepText}>
                  Follow actionable recommendations to fix issues and improve your rankings.
                </p>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className={styles.ctaSection}>
            <h2 className={styles.ctaHeadline}>
              Ready to find your SEO blind spots?
            </h2>
            <p className={styles.ctaSub}>
              Paste a URL above and get your free analysis in seconds.
            </p>
          </section>

          {/* Footer */}
          <footer className={styles.footer}>
            <p className={styles.footerText}>
              SEO <span className={styles.heroAccent}>Analyzer</span> — Free on-page SEO analysis tool
            </p>
            <div className={styles.footerLinks}>
              <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
            </div>
          </footer>
        </>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingHeader}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={styles.loadingText}>
              Fetching and analyzing the page... {progress}%
            </p>
          </div>

          {/* Skeleton loader */}
          <div className={styles.skeletonResults}>
            {/* Hero skeleton */}
            <div className={styles.skeletonHero}>
              <div className={styles.skeletonGauge} />
              <div className={styles.skeletonHeroText}>
                <div className={`${styles.skeletonLine} ${styles.skeletonW60}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonW80} ${styles.skeletonShort}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonW40} ${styles.skeletonShort}`} />
                <div className={styles.skeletonDots}>
                  <div className={styles.skeletonDot} />
                  <div className={styles.skeletonDot} />
                  <div className={styles.skeletonDot} />
                </div>
              </div>
            </div>

            {/* Card skeletons */}
            <div className={`${styles.skeletonLine} ${styles.skeletonSectionBar}`} />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonCircle} />
                <div className={styles.skeletonCardText}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonW60}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonW80} ${styles.skeletonShort}`} />
                </div>
                <div className={styles.skeletonBadge} />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className={styles.results}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className={styles.errorTitle}>Unable to Analyze Website</h2>
            <p className={styles.errorMessage}>{error}</p>
            <div className={styles.errorHelp}>
              <h3>Common Solutions:</h3>
              <ul>
                <li>
                  <strong>Check the URL:</strong> Ensure it starts with http:// or https://
                </li>
                <li>
                  <strong>Website must be online:</strong> The site needs to be publicly accessible
                </li>
                <li>
                  <strong>Firewall or blocking:</strong> Some sites block automated analysis tools
                </li>
                <li>
                  <strong>Try without www:</strong> Try both example.com and www.example.com
                </li>
              </ul>
            </div>
            <button
              className={styles.errorRetry}
              onClick={() => {
                setError('');
                setUrl('');
              }}
            >
              Try Another URL
            </button>
          </div>
        </div>
      )}

      {data && (
        <div className={styles.results} ref={resultsRef}>
          {/* Hero Summary Card */}
          <div className={styles.heroCard}>
            <div className={styles.heroLeft}>
              <OverallScoreGauge value={overallScore} />
            </div>
            <div className={styles.heroRight}>
              <h2 className={styles.heroTitle}>SEO Analysis Report</h2>
              <p className={styles.heroUrl}>{data.url}</p>
              <p className={styles.heroSummary}>{getSummaryText()}</p>
              {isCachedResult && (
                <div className={styles.cacheIndicator}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  Cached result
                  {(() => {
                    const remaining = getCacheTimeRemaining(data.url);
                    if (remaining) {
                      const hours = Math.ceil(remaining / (1000 * 60 * 60));
                      return ` (expires in ${hours}h)`;
                    }
                    return '';
                  })()}
                </div>
              )}
              <div className={styles.severityDots}>
                {counts.fail > 0 && (
                  <span className={styles.dotFail}>
                    {counts.fail} Critical
                  </span>
                )}
                {counts.warning > 0 && (
                  <span className={styles.dotWarning}>
                    {counts.warning} Warnings
                  </span>
                )}
                {counts.pass > 0 && (
                  <span className={styles.dotPass}>
                    {counts.pass} Passed
                  </span>
                )}
              </div>
              <div className={styles.actionButtons}>
                {isCachedResult && (
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    onClick={handleReAnalyze}
                    disabled={loading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Re-analyze
                  </button>
                )}
                <button
                  className={styles.actionBtn}
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                  {downloading ? "Generating..." : "Download PDF"}
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={handleDownloadMarkdown}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                  Download Markdown
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={handleSummarizeWithChatGPT}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Summarize with ChatGPT
                </button>
                {savedReportId && (
                  <button
                    className={styles.actionBtn}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/share/${savedReportId}`
                        );
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      } catch { /* fallback */ }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    {shareCopied ? "Link Copied!" : "Share Report"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SERP Preview */}
          <SerpPreview data={data} />

          {/* Critical Issues Section */}
          {failCards.length > 0 && (
            <div className={styles.severitySection}>
              <h3 className={`${styles.sectionHeader} ${styles.sectionHeaderFail}`}>
                Critical Issues ({counts.fail})
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
                    {renderCardContent(card.key, card.result)}
                  </AnalysisCard>
                );
              })}
            </div>
          )}

          {/* Warnings Section */}
          {warningCards.length > 0 && (
            <div className={styles.severitySection}>
              <h3 className={`${styles.sectionHeader} ${styles.sectionHeaderWarning}`}>
                Warnings ({counts.warning})
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
                    {renderCardContent(card.key, card.result)}
                  </AnalysisCard>
                );
              })}
            </div>
          )}

          {/* Passed Checks Section (collapsed by default) */}
          {passCards.length > 0 && (
            <div className={styles.severitySection}>
              <button
                className={`${styles.sectionHeader} ${styles.sectionHeaderPass} ${styles.collapseToggle}`}
                onClick={() => setPassedExpanded(!passedExpanded)}
                type="button"
                aria-expanded={passedExpanded}
              >
                Passed Checks ({counts.pass})
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
                      {renderCardContent(card.key, card.result)}
                    </AnalysisCard>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {hasBulkResults && (
        <div className={styles.results}>
          <BulkScanResults
            scanItems={bulkScan.scanItems}
            scanning={bulkScan.scanning}
            completedCount={bulkScan.completedCount}
            expandedUrl={bulkScan.expandedUrl}
            onSelectUrl={bulkScan.setExpandedUrl}
          >
            {bulkExpandedItem && (
              <BulkScanDetail
                scanItem={bulkExpandedItem}
                onClose={() => bulkScan.setExpandedUrl(null)}
              />
            )}
          </BulkScanResults>
        </div>
      )}

      {hasFullResults && (
        <div className={styles.results}>
          <BulkScanResults
            scanItems={fullScan.scanItems}
            scanning={fullScan.scanning}
            completedCount={fullScan.completedCount}
            expandedUrl={fullScan.expandedUrl}
            onSelectUrl={fullScan.setExpandedUrl}
          >
            {fullExpandedItem && (
              <BulkScanDetail
                scanItem={fullExpandedItem}
                onClose={() => fullScan.setExpandedUrl(null)}
              />
            )}
          </BulkScanResults>
        </div>
      )}

      {showLeadCapture && (
        <div className={styles.leadOverlay} onClick={() => setShowLeadCapture(false)}>
          <div className={styles.leadModal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.leadClose}
              onClick={() => setShowLeadCapture(false)}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className={styles.leadIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 className={styles.leadTitle}>Enter Your Details</h2>
            <p className={styles.leadSubtitle}>
              Provide your name and email to view the full SEO report.
            </p>
            {leadError && <div className={styles.leadError}>{leadError}</div>}
            <form className={styles.leadForm} onSubmit={handleLeadSubmit}>
              <div className={styles.leadField}>
                <label className={styles.leadLabel} htmlFor="leadName">Full Name</label>
                <input
                  id="leadName"
                  className={styles.leadInput}
                  type="text"
                  placeholder="John Doe"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.leadField}>
                <label className={styles.leadLabel} htmlFor="leadEmail">Email</label>
                <input
                  id="leadEmail"
                  className={styles.leadInput}
                  type="email"
                  placeholder="you@example.com"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className={styles.leadSubmit}
                disabled={leadSubmitting}
              >
                {leadSubmitting ? "Please wait..." : "View Report"}
              </button>
            </form>
            <div className={styles.leadFooter}>
              Already have an account?{" "}
              <Link href="/login" className={styles.leadFooterLink}>Sign in</Link>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={styles.toast}>{toast}</div>
      )}
    </div>
  );
}

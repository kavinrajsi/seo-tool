"use client";

import { useState, useRef, useCallback } from "react";

const ANALYSIS_CONFIG = [
  { key: "title", title: "Title Tag Analysis" },
  { key: "metaDescription", title: "Meta Description" },
  { key: "h1", title: "H1 Structure" },
  { key: "headingHierarchy", title: "Heading Hierarchy" },
  { key: "metaRobots", title: "Meta Robots" },
  { key: "sslHttps", title: "SSL/HTTPS Check" },
  { key: "canonicalUrl", title: "Canonical URL" },
  { key: "mobileResponsiveness", title: "Mobile Responsiveness" },
  { key: "pageSpeed", title: "Page Speed Analysis" },
  { key: "imageOptimization", title: "Image Optimization" },
  { key: "internalLinks", title: "Internal Links" },
  { key: "externalLinks", title: "External Links" },
  { key: "schemaMarkup", title: "Schema Markup" },
  { key: "openGraph", title: "Open Graph Tags" },
  { key: "twitterCards", title: "Twitter Cards" },
  { key: "socialImageSize", title: "Social Image Size" },
  { key: "contentAnalysis", title: "Content Analysis" },
  { key: "urlStructure", title: "URL Structure" },
  { key: "keywordsInUrl", title: "Keywords in URL" },
  { key: "sitemapDetection", title: "Sitemap Detection" },
  { key: "accessibility", title: "Accessibility Checks" },
  { key: "hreflang", title: "Hreflang Tags" },
  { key: "favicon", title: "Favicon Detection" },
  { key: "lazyLoading", title: "Lazy Loading" },
  { key: "doctype", title: "Doctype Validation" },
  { key: "characterEncoding", title: "Character Encoding" },
  { key: "googlePageSpeed", title: "Google PageSpeed Score" },
  { key: "aeo", title: "Answer Engine Optimization (AEO)" },
  { key: "geo", title: "Generative Engine Optimization (GEO)" },
  { key: "programmaticSeo", title: "Programmatic SEO (pSEO)" },
  { key: "aiSearchVisibility", title: "AI Search Visibility" },
  { key: "localSeo", title: "Local SEO" },
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
  }
  return count > 0 ? Math.round(total / count) : 0;
}

function computeCounts(results) {
  const keys = ANALYSIS_CONFIG.map((c) => c.key);
  let fail = 0;
  let warning = 0;
  let pass = 0;
  for (const key of keys) {
    const result = results[key];
    if (!result) continue;
    if (result.score === "fail") fail++;
    else if (result.score === "warning") warning++;
    else pass++;
  }
  return { fail, warning, pass };
}

export default function useFullScan(user) {
  const [domain, setDomain] = useState("");
  const [fetchingUrls, setFetchingUrls] = useState(false);
  const [scanItems, setScanItems] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [completedCount, setCompletedCount] = useState(0);
  const [expandedUrl, setExpandedUrl] = useState(null);
  const [error, setError] = useState("");
  const [sitemapCount, setSitemapCount] = useState(0);
  const [totalUrls, setTotalUrls] = useState(0);
  const cancelRef = useRef(false);

  const fetchSitemapUrls = useCallback(async () => {
    if (!domain.trim()) return;

    setFetchingUrls(true);
    setError("");
    setScanItems([]);
    setSitemapCount(0);
    setTotalUrls(0);
    setCompletedCount(0);
    setExpandedUrl(null);

    try {
      const res = await fetch("/api/sitemap-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: domain.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to fetch sitemap");
        setFetchingUrls(false);
        return;
      }

      const items = json.urls.map((url) => ({
        url,
        status: "pending",
        data: null,
        overallScore: null,
        counts: null,
        error: null,
        savedReportId: null,
      }));

      setScanItems(items);
      setSitemapCount(json.sitemapCount);
      setTotalUrls(json.urls.length);
    } catch {
      setError("Failed to connect. Please check your internet connection.");
    } finally {
      setFetchingUrls(false);
    }
  }, [domain]);

  const startFullScan = useCallback(async () => {
    if (scanItems.length === 0) return;

    cancelRef.current = false;
    setScanning(true);
    setCompletedCount(0);
    setExpandedUrl(null);
    setError("");

    // Reset all items to pending
    setScanItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: "pending",
        data: null,
        overallScore: null,
        counts: null,
        error: null,
        savedReportId: null,
      }))
    );

    let completed = 0;

    for (let i = 0; i < scanItems.length; i++) {
      if (cancelRef.current) break;

      setCurrentIndex(i);
      setScanItems((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: "analyzing" };
        return next;
      });

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: scanItems[i].url }),
        });

        const json = await res.json();

        if (!res.ok) {
          setScanItems((prev) => {
            const next = [...prev];
            next[i] = {
              ...next[i],
              status: "error",
              error: json.error || "Analysis failed",
            };
            return next;
          });
          continue;
        }

        const overallScore = computeOverallScore(json.results);
        const counts = computeCounts(json.results);
        let savedReportId = null;

        if (user) {
          try {
            const saveRes = await fetch("/api/reports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: json.url,
                results: json.results,
                loadTimeMs: json.loadTimeMs,
                contentLength: json.contentLength,
              }),
            });
            if (saveRes.ok) {
              const saved = await saveRes.json();
              savedReportId = saved.id || null;
            }
          } catch {
            // Silent fail on save
          }
        }

        completed++;
        setCompletedCount(completed);

        setScanItems((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "done",
            data: json,
            overallScore,
            counts,
            savedReportId,
          };
          return next;
        });
      } catch {
        setScanItems((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "error",
            error: "Network error — could not connect",
          };
          return next;
        });
      }
    }

    setScanning(false);
    setCurrentIndex(-1);
  }, [scanItems, user]);

  const cancelScan = useCallback(() => {
    cancelRef.current = true;
    setScanning(false);
    setCurrentIndex(-1);
  }, []);

  const resetScan = useCallback(() => {
    cancelRef.current = true;
    setScanning(false);
    setCurrentIndex(-1);
    setCompletedCount(0);
    setScanItems([]);
    setExpandedUrl(null);
    setError("");
    setDomain("");
    setSitemapCount(0);
    setTotalUrls(0);
  }, []);

  return {
    domain,
    setDomain,
    fetchingUrls,
    scanItems,
    scanning,
    currentIndex,
    completedCount,
    expandedUrl,
    setExpandedUrl,
    error,
    sitemapCount,
    totalUrls,
    fetchSitemapUrls,
    startFullScan,
    cancelScan,
    resetScan,
  };
}

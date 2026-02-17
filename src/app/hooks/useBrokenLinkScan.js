"use client";

import { useState, useRef, useCallback, useMemo } from "react";

export default function useBrokenLinkScan({ onComplete } = {}) {
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
  const [savedScanId, setSavedScanId] = useState(null);
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
        totalLinks: 0,
        brokenLinks: [],
        checkedCount: 0,
        error: null,
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

  const startScan = useCallback(async () => {
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
        totalLinks: 0,
        brokenLinks: [],
        checkedCount: 0,
        error: null,
      }))
    );

    let completed = 0;

    for (let i = 0; i < scanItems.length; i++) {
      if (cancelRef.current) break;

      setCurrentIndex(i);
      setScanItems((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: "checking" };
        return next;
      });

      try {
        const res = await fetch("/api/broken-links/check", {
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
              error: json.error || "Check failed",
            };
            return next;
          });
          completed++;
          setCompletedCount(completed);
          continue;
        }

        completed++;
        setCompletedCount(completed);

        setScanItems((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "done",
            totalLinks: json.totalLinks,
            brokenLinks: json.brokenLinks,
            checkedCount: json.checkedCount,
          };
          return next;
        });
      } catch {
        completed++;
        setCompletedCount(completed);

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

    // Auto-save completed scan
    if (!cancelRef.current) {
      try {
        const finalItems = await new Promise((resolve) => {
          setScanItems((prev) => {
            resolve(prev);
            return prev;
          });
        });
        const doneItems = finalItems.filter((s) => s.status === "done");
        const totalBroken = doneItems.reduce((sum, s) => sum + s.brokenLinks.length, 0);
        const totalChecked = doneItems.reduce((sum, s) => sum + s.checkedCount, 0);
        const pagesWithIssuesCount = doneItems.filter((s) => s.brokenLinks.length > 0).length;

        const saveBody = {
          domain: domain.trim(),
          totalPages: finalItems.length,
          totalLinks: totalChecked,
          brokenCount: totalBroken,
          pagesWithIssues: pagesWithIssuesCount,
          results: finalItems,
        };
        const saveRes = await fetch("/api/broken-links/scans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saveBody),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          setSavedScanId(saved.id || null);
        }
      } catch {
        // Silent fail on save
      }

      if (onComplete) {
        onComplete();
      }
    }
  }, [scanItems, domain, onComplete]);

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
    setSavedScanId(null);
  }, []);

  // Computed summary stats
  const summary = useMemo(() => {
    const doneItems = scanItems.filter((s) => s.status === "done");
    const totalBroken = doneItems.reduce(
      (sum, s) => sum + s.brokenLinks.length,
      0
    );
    const totalChecked = doneItems.reduce(
      (sum, s) => sum + s.checkedCount,
      0
    );
    const pagesWithIssues = doneItems.filter(
      (s) => s.brokenLinks.length > 0
    ).length;
    return { totalBroken, totalChecked, pagesWithIssues };
  }, [scanItems]);

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
    summary,
    savedScanId,
    fetchSitemapUrls,
    startScan,
    cancelScan,
    resetScan,
  };
}

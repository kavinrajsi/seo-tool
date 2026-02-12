"use client";

import { useState, useEffect, useCallback } from "react";
import useFullScan from "@/app/hooks/useFullScan";
import useNotificationSound from "@/app/hooks/useNotificationSound";
import { useProject } from "@/app/components/ProjectProvider";
import FullScanForm from "@/app/components/FullScanForm";
import BulkScanResults from "@/app/components/BulkScanResults";
import BulkScanDetail from "@/app/components/BulkScanDetail";
import styles from "./page.module.css";

export default function WebsitePage() {
  const { playSound } = useNotificationSound();
  const { activeProject, projects, refreshProjects } = useProject();
  const projectId = activeProject && activeProject !== "all" ? activeProject : undefined;
  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const websiteUrl = project?.website_url || "";

  const scanMode = project?.scan_mode || "auto";
  const lastScannedAt = project?.last_scanned_at || null;

  const [savingMode, setSavingMode] = useState(false);

  const fullScan = useFullScan({ onComplete: playSound, projectId });

  // Drawer state
  const [drawerItem, setDrawerItem] = useState(null);

  const closeDrawer = useCallback(() => {
    setDrawerItem(null);
  }, []);

  // Pre-fill domain from project website URL
  useEffect(() => {
    if (websiteUrl && !fullScan.scanning && fullScan.scanItems.length === 0) {
      try {
        const url = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
        fullScan.setDomain(url.origin);
      } catch {
        fullScan.setDomain(websiteUrl);
      }
    }
  }, [websiteUrl]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerItem) return;
    function handleKey(e) {
      if (e.key === "Escape") closeDrawer();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerItem, closeDrawer]);

  const scanDone =
    !fullScan.scanning &&
    fullScan.scanItems.length > 0 &&
    fullScan.scanItems.every((s) => s.status === "done" || s.status === "error");

  async function toggleScanMode() {
    if (!projectId || savingMode) return;
    const newMode = scanMode === "auto" ? "manual" : "auto";
    setSavingMode(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanMode: newMode }),
      });
      if (refreshProjects) refreshProjects();
    } catch {
      // silent
    } finally {
      setSavingMode(false);
    }
  }

  function formatLastScanned(dateStr) {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!projectId) {
    return (
      <>
        <h1 className={styles.heading}>Website</h1>
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <p className={styles.emptyTitle}>No project selected</p>
          <p className={styles.emptyDesc}>
            Select a project from the project selector to view its website URLs and SEO scores.
          </p>
        </div>
      </>
    );
  }

  if (!websiteUrl) {
    return (
      <>
        <h1 className={styles.heading}>Website</h1>
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <p className={styles.emptyTitle}>No website URL configured</p>
          <p className={styles.emptyDesc}>
            Add a website URL to the project &ldquo;{project?.name}&rdquo; in{" "}
            <a href={`/dashboard/projects/${projectId}`} className={styles.emptyLink}>project settings</a>{" "}
            to discover and analyze all its pages.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Website</h1>
        {scanDone && (
          <button
            className={styles.resetBtn}
            onClick={fullScan.resetScan}
            type="button"
          >
            Rescan Website
          </button>
        )}
      </div>

      {websiteUrl && (
        <p className={styles.websiteUrl}>{websiteUrl}</p>
      )}

      {/* Scan mode & schedule info */}
      <div className={styles.scanConfig}>
        <div className={styles.scanModeRow}>
          <div className={styles.scanModeLabel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Scan Schedule</span>
          </div>
          <div className={styles.scanModeToggle}>
            <button
              type="button"
              className={`${styles.modeBtn} ${scanMode === "auto" ? styles.modeBtnActive : ""}`}
              onClick={() => scanMode !== "auto" && toggleScanMode()}
              disabled={savingMode}
            >
              Auto (Daily 6 AM)
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${scanMode === "manual" ? styles.modeBtnActive : ""}`}
              onClick={() => scanMode !== "manual" && toggleScanMode()}
              disabled={savingMode}
            >
              Manual Only
            </button>
          </div>
        </div>

        <div className={styles.scanMetaRow}>
          <span className={styles.scanMetaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Last scanned: {formatLastScanned(lastScannedAt)}
          </span>
          {scanMode === "auto" && (
            <span className={styles.scanMetaItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Next scan: Tomorrow at 6:00 AM
            </span>
          )}
        </div>
      </div>

      {!scanDone && (
        <FullScanForm
          domain={fullScan.domain}
          setDomain={fullScan.setDomain}
          fetchingUrls={fullScan.fetchingUrls}
          totalUrls={fullScan.totalUrls}
          sitemapCount={fullScan.sitemapCount}
          scanning={fullScan.scanning}
          error={fullScan.error}
          onFetchSitemap={fullScan.fetchSitemapUrls}
          onStartScan={fullScan.startFullScan}
          onCancel={fullScan.cancelScan}
          readOnly
        />
      )}

      <BulkScanResults
        scanItems={fullScan.scanItems}
        scanning={fullScan.scanning}
        completedCount={fullScan.completedCount}
        expandedUrl={fullScan.expandedUrl}
        onSelectUrl={fullScan.setExpandedUrl}
        onViewUrl={(item) => setDrawerItem(item)}
      />

      {/* Right-side drawer */}
      {drawerItem && (
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.drawerBody}>
              <BulkScanDetail
                scanItem={drawerItem}
                onClose={closeDrawer}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

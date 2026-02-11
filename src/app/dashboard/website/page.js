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
  const { activeProject, projects } = useProject();
  const projectId = activeProject && activeProject !== "all" ? activeProject : undefined;
  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const websiteUrl = project?.website_url || "";

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

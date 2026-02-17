"use client";

import { useState, useEffect, useCallback } from "react";
import useFullScan from "@/app/hooks/useFullScan";
import useNotificationSound from "@/app/hooks/useNotificationSound";
import FullScanForm from "@/app/components/FullScanForm";
import BulkScanResults from "@/app/components/BulkScanResults";
import BulkScanDetail from "@/app/components/BulkScanDetail";
import styles from "./page.module.css";

export default function FullScanPage() {
  const { playSound } = useNotificationSound();
  const fullScan = useFullScan({ onComplete: playSound });

  // Drawer state
  const [drawerItem, setDrawerItem] = useState(null);

  const closeDrawer = useCallback(() => {
    setDrawerItem(null);
  }, []);

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

  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Full Scan</h1>
        {scanDone && (
          <button
            className={styles.resetBtn}
            onClick={fullScan.resetScan}
            type="button"
          >
            Start New Full Scan
          </button>
        )}
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

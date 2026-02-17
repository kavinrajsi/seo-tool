"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import useBulkScan from "@/app/hooks/useBulkScan";
import useNotificationSound from "@/app/hooks/useNotificationSound";
import BulkScanForm from "@/app/components/BulkScanForm";
import BulkScanResults from "@/app/components/BulkScanResults";
import BulkScanDetail from "@/app/components/BulkScanDetail";
import styles from "./page.module.css";

export default function BulkScanPage() {
  const { activeProject } = useProject();
  const { playSound } = useNotificationSound();
  const bulkScan = useBulkScan({ onComplete: playSound, projectId: activeProject?.id || null });

  // Drawer state
  const [drawerItem, setDrawerItem] = useState(null);

  const closeDrawer = useCallback(() => {
    setDrawerItem(null);
  }, []);

  useEffect(() => {
    if (!drawerItem) return;
    function handleKey(e) {
      if (e.key === "Escape") closeDrawer();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerItem, closeDrawer]);

  const scanDone =
    !bulkScan.scanning &&
    bulkScan.scanItems.length > 0 &&
    bulkScan.scanItems.every((s) => s.status === "done" || s.status === "error");

  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Bulk Scan</h1>
        {scanDone && (
          <button
            className={styles.resetBtn}
            onClick={bulkScan.resetScan}
            type="button"
          >
            Start New Bulk Scan
          </button>
        )}
      </div>

      {(!scanDone || bulkScan.scanItems.length === 0) && (
        <BulkScanForm
          urls={bulkScan.urls}
          setUrls={bulkScan.setUrls}
          urlCount={bulkScan.urlCount}
          maxUrls={bulkScan.maxUrls}
          scanning={bulkScan.scanning}
          error={bulkScan.error}
          onScan={bulkScan.startBulkScan}
          onCancel={bulkScan.cancelScan}
        />
      )}

      <BulkScanResults
        scanItems={bulkScan.scanItems}
        scanning={bulkScan.scanning}
        completedCount={bulkScan.completedCount}
        expandedUrl={bulkScan.expandedUrl}
        onSelectUrl={bulkScan.setExpandedUrl}
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

"use client";

import useBulkScan from "@/app/hooks/useBulkScan";
import BulkScanForm from "@/app/components/BulkScanForm";
import BulkScanResults from "@/app/components/BulkScanResults";
import BulkScanDetail from "@/app/components/BulkScanDetail";
import styles from "./page.module.css";

export default function BulkScanPage() {
  const bulkScan = useBulkScan();

  const expandedItem = bulkScan.scanItems.find(
    (item) => item.url === bulkScan.expandedUrl && item.status === "done"
  );

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
      >
        {expandedItem && (
          <BulkScanDetail
            scanItem={expandedItem}
            onClose={() => bulkScan.setExpandedUrl(null)}
          />
        )}
      </BulkScanResults>
    </>
  );
}

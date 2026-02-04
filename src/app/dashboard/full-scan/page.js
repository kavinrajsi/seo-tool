"use client";

import useFullScan from "@/app/hooks/useFullScan";
import FullScanForm from "@/app/components/FullScanForm";
import BulkScanResults from "@/app/components/BulkScanResults";
import BulkScanDetail from "@/app/components/BulkScanDetail";
import styles from "./page.module.css";

export default function FullScanPage() {
  const fullScan = useFullScan();

  const expandedItem = fullScan.scanItems.find(
    (item) => item.url === fullScan.expandedUrl && item.status === "done"
  );

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
      >
        {expandedItem && (
          <BulkScanDetail
            scanItem={expandedItem}
            onClose={() => fullScan.setExpandedUrl(null)}
          />
        )}
      </BulkScanResults>
    </>
  );
}

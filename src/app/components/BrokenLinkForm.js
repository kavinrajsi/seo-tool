"use client";

import styles from "./FullScanForm.module.css";

export default function BrokenLinkForm({
  domain,
  setDomain,
  fetchingUrls,
  totalUrls,
  sitemapCount,
  scanning,
  error,
  onFetchSitemap,
  onStartScan,
  onCancel,
}) {
  const hasFetchedUrls = totalUrls > 0 && !fetchingUrls;

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.input}
          placeholder="Enter domain (e.g., example.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          disabled={fetchingUrls || scanning}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !fetchingUrls && !scanning && domain.trim()) {
              e.preventDefault();
              onFetchSitemap();
            }
          }}
        />
        {!hasFetchedUrls && !scanning && (
          <button
            className={styles.fetchBtn}
            onClick={onFetchSitemap}
            disabled={fetchingUrls || !domain.trim()}
            type="button"
          >
            {fetchingUrls ? (
              <>
                <span className={styles.spinner} />
                Fetching...
              </>
            ) : (
              "Fetch Sitemap"
            )}
          </button>
        )}
      </div>

      {hasFetchedUrls && !scanning && (
        <div className={styles.foundInfo}>
          <p className={styles.foundText}>
            Found <strong>{totalUrls}</strong> page{totalUrls !== 1 ? "s" : ""} in{" "}
            <strong>{sitemapCount}</strong> sitemap{sitemapCount !== 1 ? "s" : ""}
          </p>
          <button
            className={styles.scanBtn}
            onClick={onStartScan}
            type="button"
          >
            Scan All {totalUrls} Page{totalUrls !== 1 ? "s" : ""}
          </button>
        </div>
      )}

      {scanning && (
        <div className={styles.scanningRow}>
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            type="button"
          >
            Cancel Scan
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

"use client";

import styles from "./BulkScanForm.module.css";

export default function BulkScanForm({
  urls,
  setUrls,
  urlCount,
  maxUrls,
  scanning,
  error,
  onScan,
  onCancel,
}) {
  return (
    <div className={styles.wrapper}>
      <textarea
        className={styles.textarea}
        placeholder={"Enter URLs (one per line)\ne.g.\nexample.com\nhttps://another-site.com"}
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        disabled={scanning}
        rows={5}
      />
      <div className={styles.footer}>
        <span className={styles.counter}>
          {urlCount}/{maxUrls} URLs
        </span>
        <div className={styles.actions}>
          {scanning ? (
            <button
              className={styles.cancelBtn}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          ) : (
            <button
              className={styles.scanBtn}
              onClick={onScan}
              disabled={urlCount === 0}
              type="button"
            >
              Scan {urlCount} URL{urlCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

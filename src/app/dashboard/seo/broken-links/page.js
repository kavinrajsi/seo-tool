"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useBrokenLinkScan from "@/app/hooks/useBrokenLinkScan";
import useNotificationSound from "@/app/hooks/useNotificationSound";
import BrokenLinkForm from "@/app/components/BrokenLinkForm";
import styles from "./page.module.css";

function getCodeBadgeClass(status) {
  if (status === 0) return styles.codeTimeout;
  if (status >= 500) return styles.code5xx;
  return styles.code4xx;
}

function getCodeLabel(status, statusText) {
  if (status === 0) return statusText || "Timeout";
  return `${status} ${statusText}`;
}

function exportCSV(scanItems) {
  const rows = [["Source Page", "Broken Link", "Status", "Status Text", "Anchor Text", "Type"]];

  for (const item of scanItems) {
    if (item.status !== "done") continue;
    for (const link of item.brokenLinks) {
      rows.push([
        item.url,
        link.href,
        link.status || 0,
        link.statusText || "",
        (link.anchor || "").replace(/"/g, '""'),
        link.type,
      ]);
    }
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "broken-links-report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BrokenLinksPage() {
  const { playSound } = useNotificationSound();

  const [pastScans, setPastScans] = useState([]);
  const [pastScansLoading, setPastScansLoading] = useState(true);
  const [viewingSavedScan, setViewingSavedScan] = useState(false);
  const [savedScanItems, setSavedScanItems] = useState([]);
  const [savedScanDomain, setSavedScanDomain] = useState("");
  const [savedScanSummary, setSavedScanSummary] = useState(null);

  const fetchPastScans = useCallback(async () => {
    try {
      const res = await fetch("/api/broken-links/scans?limit=50");
      if (res.ok) {
        const json = await res.json();
        setPastScans(json.scans || []);
      }
    } catch {
      // Silent fail
    } finally {
      setPastScansLoading(false);
    }
  }, []);

  const handleScanComplete = useCallback(() => {
    playSound();
    fetchPastScans();
  }, [playSound, fetchPastScans]);

  const scan = useBrokenLinkScan({ onComplete: handleScanComplete });

  const [drawerItem, setDrawerItem] = useState(null);
  const [filterBrokenOnly, setFilterBrokenOnly] = useState(false);

  const closeDrawer = useCallback(() => {
    setDrawerItem(null);
  }, []);

  useEffect(() => {
    fetchPastScans();
  }, [fetchPastScans]);

  useEffect(() => {
    if (!drawerItem) return;
    function handleKey(e) {
      if (e.key === "Escape") closeDrawer();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerItem, closeDrawer]);

  const scanDone =
    !scan.scanning &&
    scan.scanItems.length > 0 &&
    scan.scanItems.every((s) => s.status === "done" || s.status === "error");

  // Use saved scan items when viewing a past scan, otherwise live scan items
  const activeItems = viewingSavedScan ? savedScanItems : scan.scanItems;
  const activeSummary = viewingSavedScan ? savedScanSummary : scan.summary;
  const activeIsDone = viewingSavedScan || scanDone;

  const filteredItems = useMemo(() => {
    if (!filterBrokenOnly) return activeItems;
    return activeItems.filter(
      (s) => s.status === "done" && s.brokenLinks.length > 0
    );
  }, [activeItems, filterBrokenOnly]);

  const hasBrokenLinks = activeSummary && activeSummary.totalBroken > 0;

  const handleViewScan = useCallback(async (scanId) => {
    try {
      const res = await fetch(`/api/broken-links/scans/${scanId}`);
      if (!res.ok) return;
      const data = await res.json();
      const items = data.results_json || [];
      setSavedScanItems(items);
      setSavedScanDomain(data.domain);

      const doneItems = items.filter((s) => s.status === "done");
      setSavedScanSummary({
        totalBroken: doneItems.reduce((sum, s) => sum + (s.brokenLinks?.length || 0), 0),
        totalChecked: doneItems.reduce((sum, s) => sum + (s.checkedCount || 0), 0),
        pagesWithIssues: doneItems.filter((s) => (s.brokenLinks?.length || 0) > 0).length,
      });

      setViewingSavedScan(true);
      setFilterBrokenOnly(false);
    } catch {
      // Silent fail
    }
  }, []);

  const handleExitSavedView = useCallback(() => {
    setViewingSavedScan(false);
    setSavedScanItems([]);
    setSavedScanDomain("");
    setSavedScanSummary(null);
    setFilterBrokenOnly(false);
    setDrawerItem(null);
  }, []);

  const handleDeleteScan = useCallback(async (scanId) => {
    if (!confirm("Delete this scan?")) return;
    try {
      const res = await fetch(`/api/broken-links/scans/${scanId}`, { method: "DELETE" });
      if (res.ok) {
        setPastScans((prev) => prev.filter((s) => s.id !== scanId));
      }
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>
          {viewingSavedScan ? `Scan: ${savedScanDomain}` : "Broken Link Checker"}
        </h1>
        {viewingSavedScan && (
          <button
            className={styles.resetBtn}
            onClick={handleExitSavedView}
            type="button"
          >
            Back to Scanner
          </button>
        )}
        {!viewingSavedScan && scanDone && (
          <button
            className={styles.resetBtn}
            onClick={scan.resetScan}
            type="button"
          >
            Start New Scan
          </button>
        )}
      </div>

      {!viewingSavedScan && !scanDone && (
        <BrokenLinkForm
          domain={scan.domain}
          setDomain={scan.setDomain}
          fetchingUrls={scan.fetchingUrls}
          totalUrls={scan.totalUrls}
          sitemapCount={scan.sitemapCount}
          scanning={scan.scanning}
          error={scan.error}
          onFetchSitemap={scan.fetchSitemapUrls}
          onStartScan={scan.startScan}
          onCancel={scan.cancelScan}
        />
      )}

      {/* Progress bar during scan */}
      {!viewingSavedScan && scan.scanning && scan.totalUrls > 0 && (
        <div className={styles.progressSection}>
          <p className={styles.progressLabel}>
            Checking page {scan.completedCount} of {scan.totalUrls}
          </p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${(scan.completedCount / scan.totalUrls) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      {activeItems.length > 0 && ((!viewingSavedScan && (scan.scanning || scanDone)) || viewingSavedScan) && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {viewingSavedScan ? activeItems.length : scan.completedCount}
            </div>
            <div className={styles.statLabel}>Pages Checked</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{activeSummary.totalChecked}</div>
            <div className={styles.statLabel}>Links Checked</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${activeSummary.totalBroken > 0 ? styles.broken : ""}`}>
              {activeSummary.totalBroken}
            </div>
            <div className={styles.statLabel}>Broken Links</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${activeSummary.pagesWithIssues > 0 ? styles.broken : ""}`}>
              {activeSummary.pagesWithIssues}
            </div>
            <div className={styles.statLabel}>Pages with Issues</div>
          </div>
        </div>
      )}

      {/* Filter bar + Export */}
      {activeIsDone && activeItems.length > 0 && (
        <div className={styles.filterBar}>
          <button
            className={`${styles.filterToggle} ${filterBrokenOnly ? styles.active : ""}`}
            onClick={() => setFilterBrokenOnly((p) => !p)}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {filterBrokenOnly ? "Show All Pages" : "Only Pages with Issues"}
          </button>

          {hasBrokenLinks && (
            <button
              className={styles.exportBtn}
              onClick={() => exportCSV(activeItems)}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          )}
        </div>
      )}

      {/* Desktop table */}
      {filteredItems.length > 0 && (
        <>
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Page URL</th>
                <th>Total Links</th>
                <th>Broken</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, i) => (
                <tr
                  key={item.url}
                  className={item.status === "done" ? styles.clickable : ""}
                  onClick={() => {
                    if (item.status === "done") setDrawerItem(item);
                  }}
                >
                  <td>{i + 1}</td>
                  <td className={styles.urlCell}>{item.url}</td>
                  <td>{item.status === "done" ? item.totalLinks : "—"}</td>
                  <td>
                    {item.status === "done" ? (
                      <span className={item.brokenLinks.length > 0 ? styles.brokenCount : styles.brokenCountZero}>
                        {item.brokenLinks.length}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {item.status === "pending" && (
                      <span className={`${styles.statusBadge} ${styles.statusPending}`}>Pending</span>
                    )}
                    {item.status === "checking" && (
                      <span className={`${styles.statusBadge} ${styles.statusChecking}`}>Checking...</span>
                    )}
                    {item.status === "done" && (
                      <span className={`${styles.statusBadge} ${styles.statusDone}`}>Done</span>
                    )}
                    {item.status === "error" && (
                      <span className={`${styles.statusBadge} ${styles.statusError}`}>Error</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className={styles.mobileCards}>
            {filteredItems.map((item) => (
              <div
                key={item.url}
                className={styles.mobileCard}
                onClick={() => {
                  if (item.status === "done") setDrawerItem(item);
                }}
              >
                <div className={styles.mobileCardUrl}>{item.url}</div>
                <div className={styles.mobileCardStats}>
                  {item.status === "done" ? (
                    <>
                      <span>{item.totalLinks} links</span>
                      <span className={item.brokenLinks.length > 0 ? styles.brokenCount : ""}>
                        {item.brokenLinks.length} broken
                      </span>
                    </>
                  ) : (
                    <span>{item.status === "checking" ? "Checking..." : item.status === "error" ? "Error" : "Pending"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeIsDone && filteredItems.length === 0 && filterBrokenOnly && (
        <div className={styles.emptyState}>
          No pages with broken links found. All links are healthy!
        </div>
      )}

      {/* Past Scans */}
      {!viewingSavedScan && (
        <div className={styles.pastScansSection}>
          <h2 className={styles.pastScansHeading}>Past Scans</h2>

          {pastScansLoading ? (
            <div className={styles.pastScansEmpty}>Loading past scans...</div>
          ) : pastScans.length === 0 ? (
            <div className={styles.pastScansEmpty}>
              No past scans yet. Run a scan to save results automatically.
            </div>
          ) : (
            <>
              <table className={styles.pastScansTable}>
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Pages</th>
                    <th>Broken Links</th>
                    <th>Pages with Issues</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastScans.map((s) => (
                    <tr key={s.id}>
                      <td className={styles.urlCell}>{s.domain}</td>
                      <td>{s.total_pages}</td>
                      <td>
                        <span className={s.broken_count > 0 ? styles.brokenCount : styles.brokenCountZero}>
                          {s.broken_count}
                        </span>
                      </td>
                      <td>{s.pages_with_issues}</td>
                      <td>{formatDate(s.created_at)}</td>
                      <td>
                        <div className={styles.pastScansActions}>
                          <button
                            className={styles.viewBtn}
                            onClick={() => handleViewScan(s.id)}
                            type="button"
                          >
                            View
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteScan(s.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile past scans cards */}
              <div className={styles.pastScansMobile}>
                {pastScans.map((s) => (
                  <div key={s.id} className={styles.pastScanCard}>
                    <div className={styles.pastScanCardDomain}>{s.domain}</div>
                    <div className={styles.pastScanCardStats}>
                      <span>{s.total_pages} pages</span>
                      <span className={s.broken_count > 0 ? styles.brokenCount : ""}>
                        {s.broken_count} broken
                      </span>
                      <span>{formatDate(s.created_at)}</span>
                    </div>
                    <div className={styles.pastScanCardActions}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => handleViewScan(s.id)}
                        type="button"
                      >
                        View
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteScan(s.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Drawer */}
      {drawerItem && (
        <div className={styles.drawerOverlay} onClick={closeDrawer}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>
                  Broken Links ({drawerItem.brokenLinks.length})
                </h2>
                <p className={styles.drawerSubtitle}>{drawerItem.url}</p>
              </div>
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
              {drawerItem.brokenLinks.length === 0 ? (
                <div className={styles.drawerEmpty}>
                  No broken links found on this page.
                </div>
              ) : (
                drawerItem.brokenLinks.map((link, i) => (
                  <div key={i} className={styles.brokenLinkItem}>
                    <div className={styles.brokenLinkHref}>{link.href}</div>
                    <div className={styles.brokenLinkMeta}>
                      <span className={`${styles.codeBadge} ${getCodeBadgeClass(link.status)}`}>
                        {getCodeLabel(link.status, link.statusText)}
                      </span>
                      <span className={`${styles.typeBadge} ${link.type === "internal" ? styles.typeInternal : styles.typeExternal}`}>
                        {link.type}
                      </span>
                      {link.anchor && (
                        <span className={styles.brokenLinkAnchor}>
                          &ldquo;{link.anchor}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

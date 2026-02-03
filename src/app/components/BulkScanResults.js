"use client";

import styles from "./BulkScanResults.module.css";

function statusLabel(status) {
  switch (status) {
    case "pending":
      return "Pending";
    case "analyzing":
      return "Analyzing";
    case "done":
      return "Done";
    case "error":
      return "Error";
    default:
      return status;
  }
}

function scoreColorClass(score) {
  if (score >= 70) return styles.scoreGood;
  if (score >= 40) return styles.scoreAverage;
  return styles.scorePoor;
}

export default function BulkScanResults({
  scanItems,
  scanning,
  completedCount,
  expandedUrl,
  onSelectUrl,
  children,
}) {
  if (scanItems.length === 0) return null;

  const total = scanItems.length;
  const doneCount = scanItems.filter(
    (s) => s.status === "done" || s.status === "error"
  ).length;
  const progressPct = scanning
    ? Math.round((doneCount / total) * 100)
    : 100;

  return (
    <div className={styles.wrapper}>
      {/* Progress bar */}
      {scanning && (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className={styles.progressText}>
            Analyzing {doneCount + 1} of {total}...
          </p>
        </div>
      )}

      {!scanning && doneCount === total && (
        <p className={styles.completeText}>
          Scan complete — {completedCount} of {total} succeeded
        </p>
      )}

      {/* Desktop table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>#</th>
            <th className={styles.th}>URL</th>
            <th className={styles.th}>Score</th>
            <th className={styles.th}>Critical</th>
            <th className={styles.th}>Warnings</th>
            <th className={styles.th}>Passed</th>
            <th className={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {scanItems.map((item, i) => {
            const isExpanded = expandedUrl === item.url;
            const clickable = item.status === "done";
            return (
              <tr
                key={item.url}
                className={`${styles.row} ${clickable ? styles.rowClickable : ""} ${isExpanded ? styles.rowExpanded : ""}`}
                onClick={() => clickable && onSelectUrl(isExpanded ? null : item.url)}
              >
                <td className={styles.td}>{i + 1}</td>
                <td className={`${styles.td} ${styles.urlCell}`}>{item.url}</td>
                <td className={`${styles.td} ${styles.scoreCell} ${item.overallScore !== null ? scoreColorClass(item.overallScore) : ""}`}>
                  {item.overallScore !== null ? item.overallScore : "—"}
                </td>
                <td className={styles.td}>
                  {item.counts ? (
                    <span className={`${styles.countBadge} ${styles.countFail}`}>{item.counts.fail}</span>
                  ) : "—"}
                </td>
                <td className={styles.td}>
                  {item.counts ? (
                    <span className={`${styles.countBadge} ${styles.countWarning}`}>{item.counts.warning}</span>
                  ) : "—"}
                </td>
                <td className={styles.td}>
                  {item.counts ? (
                    <span className={`${styles.countBadge} ${styles.countPass}`}>{item.counts.pass}</span>
                  ) : "—"}
                </td>
                <td className={styles.td}>
                  <span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>
                    {statusLabel(item.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {scanItems.map((item, i) => {
          const isExpanded = expandedUrl === item.url;
          const clickable = item.status === "done";
          return (
            <div
              key={item.url}
              className={`${styles.mobileCard} ${isExpanded ? styles.mobileCardExpanded : ""}`}
              onClick={() => clickable && onSelectUrl(isExpanded ? null : item.url)}
            >
              <div className={styles.mobileCardTop}>
                <span className={styles.mobileCardIndex}>{i + 1}.</span>
                <span className={styles.mobileCardUrl}>{item.url}</span>
                <span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
              {item.status === "done" && (
                <div className={styles.mobileCardBottom}>
                  <span className={`${styles.scoreCell} ${scoreColorClass(item.overallScore)}`}>
                    {item.overallScore}
                  </span>
                  <div className={styles.severityCounts}>
                    <span className={`${styles.countBadge} ${styles.countFail}`}>{item.counts.fail}</span>
                    <span className={`${styles.countBadge} ${styles.countWarning}`}>{item.counts.warning}</span>
                    <span className={`${styles.countBadge} ${styles.countPass}`}>{item.counts.pass}</span>
                  </div>
                </div>
              )}
              {item.status === "error" && (
                <p className={styles.errorText}>{item.error}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded detail panel */}
      {children}
    </div>
  );
}

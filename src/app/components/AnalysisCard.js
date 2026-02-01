"use client";

import { useState } from "react";
import styles from "./AnalysisCard.module.css";
import ScoreIndicator from "./ScoreIndicator";

export default function AnalysisCard({
  title,
  description,
  score,
  issues,
  recommendations,
  children,
  index,
  defaultExpanded = true,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const severityClass =
    score === "fail"
      ? styles.fail
      : score === "warning"
        ? styles.warning
        : styles.pass;

  return (
    <div className={`${styles.card} ${severityClass}`}>
      <button
        className={styles.header}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        type="button"
      >
        <span className={`${styles.itemNumber} ${severityClass}`}>
          {index}
        </span>
        <div className={styles.headerText}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
        <ScoreIndicator score={score} />
        <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}>
          &#8250;
        </span>
      </button>

      {expanded && (
        <div className={styles.body}>
          {children && <div className={styles.content}>{children}</div>}

          {issues && issues.length > 0 && (
            <div className={styles.findingsBlock}>
              <h3 className={styles.sectionTitle}>Findings</h3>
              <ul className={styles.list}>
                {issues.map((issue, i) => (
                  <li key={i} className={styles.listItem}>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations && recommendations.length > 0 && (
            <div className={styles.fixBlock}>
              <h3 className={styles.sectionTitle}>How to Fix</h3>
              <ul className={styles.list}>
                {recommendations.map((rec, i) => (
                  <li key={i} className={styles.recommendation}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

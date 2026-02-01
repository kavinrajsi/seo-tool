"use client";

import { useState } from "react";
import styles from "./LinkList.module.css";

export default function LinkList({ links, baseUrl, showAnchor = false, limit = 10 }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? links : links.slice(0, limit);
  const hasMore = links.length > limit;

  return (
    <div className={styles.wrapper}>
      <div className={styles.list}>
        {visible.map((link, i) => (
          <div key={i} className={styles.item}>
            <svg className={styles.icon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <div className={styles.linkInfo}>
              <a
                href={link.href.startsWith("http") ? link.href : (baseUrl || "") + link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.url}
              >
                {link.href}
              </a>
              {showAnchor && link.text && (
                <span className={styles.anchor}>{link.text}</span>
              )}
            </div>
            {link.rel && link.rel.includes("nofollow") && (
              <span className={styles.tag}>nofollow</span>
            )}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : `Show all ${links.length} links`}
        </button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import styles from "./KeywordAnalysis.module.css";

const TABS = [
  { id: "keywords", label: "Keywords" },
  { id: "two", label: "2-word" },
  { id: "three", label: "3-word" },
  { id: "four", label: "4-word" },
];

export default function KeywordAnalysis({
  wordCount,
  keywords,
  twoWordPhrases,
  threeWordPhrases,
  fourWordPhrases,
}) {
  const [activeTab, setActiveTab] = useState("keywords");

  const dataMap = {
    keywords,
    two: twoWordPhrases,
    three: threeWordPhrases,
    four: fourWordPhrases,
  };

  const items = dataMap[activeTab] || [];
  const maxCount = items.length > 0 ? items[0].count : 1;

  return (
    <div className={styles.wrapper}>
      <div className={styles.stat}>
        <span className={styles.statValue}>{wordCount.toLocaleString()}</span>
        <span className={styles.statLabel}>Total Words</span>
      </div>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>
          No repeated {activeTab === "keywords" ? "keywords" : "phrases"} found.
        </p>
      ) : (
        <div className={styles.list}>
          {items.map((item, i) => {
            const text = item.word || item.phrase;
            const barWidth = Math.max(8, (item.count / maxCount) * 100);
            return (
              <div key={i} className={styles.row}>
                <span className={styles.rank}>{i + 1}</span>
                <div className={styles.barWrapper}>
                  <div className={styles.barBg}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={styles.phrase}>{text}</span>
                </div>
                <span className={styles.count}>{item.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

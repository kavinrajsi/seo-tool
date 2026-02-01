"use client";

import styles from "./HeadingTree.module.css";

export default function HeadingTree({ headings }) {
  if (!headings || headings.length === 0) return null;

  return (
    <div className={styles.tree}>
      {headings.map((h, i) => (
        <div
          key={i}
          className={styles.item}
          style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
        >
          <span className={styles.tag}>{h.tag}</span>
          <span className={styles.text}>{h.text || "(empty)"}</span>
        </div>
      ))}
    </div>
  );
}

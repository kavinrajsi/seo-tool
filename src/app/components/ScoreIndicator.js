"use client";

import styles from "./ScoreIndicator.module.css";

export default function ScoreIndicator({ score }) {
  const config = {
    pass: { label: "Pass", icon: "\u2713", className: styles.pass },
    warning: { label: "Warning", icon: "\u26A0", className: styles.warning },
    fail: { label: "Fail", icon: "\u2717", className: styles.fail },
  };

  const { label, icon, className } = config[score] || config.fail;

  return (
    <span className={`${styles.badge} ${className}`}>
      <span className={styles.icon}>{icon}</span>
      {label}
    </span>
  );
}

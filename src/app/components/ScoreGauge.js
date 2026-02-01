"use client";

import styles from "./ScoreGauge.module.css";

export default function ScoreGauge({ value, label }) {
  const radius = 36;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  let colorClass = styles.good;
  if (value < 50) colorClass = styles.poor;
  else if (value < 90) colorClass = styles.average;

  return (
    <div className={styles.gauge}>
      <svg width="88" height="88" viewBox="0 0 88 88" className={styles.svg}>
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="#222222"
          strokeWidth={stroke}
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          className={colorClass}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div className={styles.valueWrapper}>
        <span className={`${styles.value} ${colorClass}`}>{value}</span>
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

"use client";

import styles from "./ScoreGauge.module.css";

export default function ScoreGauge({ value, score, label, size = 88 }) {
  // Support both 'value' and 'score' props
  const displayValue = value !== undefined ? value : score;

  // Handle null/undefined values
  const safeValue = displayValue ?? 0;

  const scale = size / 88;
  const radius = 36;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  let colorClass = styles.good;
  if (safeValue < 50) colorClass = styles.poor;
  else if (safeValue < 90) colorClass = styles.average;

  return (
    <div className={styles.gauge}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 88 88"
        className={styles.svg}
      >
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
        <span className={`${styles.value} ${colorClass}`}>
          {displayValue === null || displayValue === undefined ? '—' : safeValue}
        </span>
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

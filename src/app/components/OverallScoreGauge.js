"use client";

import styles from "./OverallScoreGauge.module.css";

export default function OverallScoreGauge({ value }) {
  const clampedValue = Math.max(0, Math.min(100, Math.round(value)));

  // Semi-circle arc parameters
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Arc from 180 degrees (left) to 0 degrees (right) = semi-circle
  const circumference = Math.PI * radius;
  const filledLength = (clampedValue / 100) * circumference;
  const dashOffset = circumference - filledLength;

  let colorClass = styles.good;
  if (clampedValue < 50) colorClass = styles.poor;
  else if (clampedValue < 90) colorClass = styles.average;

  return (
    <div className={styles.gauge}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
      >
        {/* Background track */}
        <path
          d={`M ${strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${centerY}`}
          fill="none"
          stroke="#222222"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${centerY}`}
          fill="none"
          className={colorClass}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className={styles.valueWrapper}>
        <span className={`${styles.value} ${colorClass}`}>{clampedValue}</span>
        <span className={styles.suffix}>/100</span>
      </div>
    </div>
  );
}

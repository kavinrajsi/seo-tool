"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";

const URL_COLORS = [
  "#16a34a", "#2563eb", "#d97706", "#dc2626", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

function scoreClass(score) {
  if (score >= 70) return styles.scoreGood;
  if (score >= 40) return styles.scoreAverage;
  return styles.scorePoor;
}

function statScoreClass(score) {
  if (score >= 70) return styles.statValueGood;
  if (score >= 40) return styles.statValueAverage;
  return styles.statValuePoor;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateLong(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}

export default function ScoreHistoryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [days, setDays] = useState(90);
  const [tooltip, setTooltip] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (selectedUrl) params.set("url", selectedUrl);
      const res = await fetch(`/api/reports/history?${params}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || `Server error (${res.status})`);
        setLoading(false);
        return;
      }
      setData(await res.json());
    } catch {
      setError("Network error — could not reach the server.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [days, selectedUrl]);

  // Chart data
  const chartData = useMemo(() => {
    if (!data || !data.reports.length) return null;

    const reports = data.reports;
    const urlsInView = selectedUrl
      ? [selectedUrl]
      : [...new Set(reports.map((r) => r.url))];

    // Assign colors
    const colorMap = {};
    urlsInView.forEach((u, i) => {
      colorMap[u] = URL_COLORS[i % URL_COLORS.length];
    });

    // Build lines for each URL
    const lines = {};
    urlsInView.forEach((u) => {
      lines[u] = [];
    });

    reports.forEach((r) => {
      if (lines[r.url]) {
        lines[r.url].push({
          date: r.created_at,
          score: r.overall_score,
          url: r.url,
          fail: r.fail_count,
          warning: r.warning_count,
          pass: r.pass_count,
        });
      }
    });

    // Chart dimensions
    const W = 800;
    const H = 240;
    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    // Time range
    const allDates = reports.map((r) => new Date(r.created_at).getTime());
    let minTime = Math.min(...allDates);
    let maxTime = Math.max(...allDates);
    if (minTime === maxTime) {
      minTime -= 86400000;
      maxTime += 86400000;
    }
    const timeRange = maxTime - minTime;

    function xPos(dateStr) {
      const t = new Date(dateStr).getTime();
      return padLeft + ((t - minTime) / timeRange) * plotW;
    }

    function yPos(score) {
      return padTop + plotH - (score / 100) * plotH;
    }

    // Grid lines (horizontal at 0, 25, 50, 75, 100)
    const gridLines = [0, 25, 50, 75, 100].map((v) => ({
      y: yPos(v),
      label: v,
    }));

    // X-axis labels (distribute evenly, max 8)
    const labelCount = Math.min(8, reports.length);
    const xLabels = [];
    for (let i = 0; i < labelCount; i++) {
      const t = minTime + (timeRange * i) / (labelCount - 1 || 1);
      xLabels.push({
        x: padLeft + (plotW * i) / (labelCount - 1 || 1),
        label: formatDate(new Date(t).toISOString()),
      });
    }

    // Build SVG paths and dots for each URL
    const paths = [];
    const dots = [];
    for (const [u, points] of Object.entries(lines)) {
      if (points.length === 0) continue;
      const color = colorMap[u];

      // Path
      const pathParts = points.map((p, i) => {
        const x = xPos(p.date);
        const y = yPos(p.score);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      });
      paths.push({ d: pathParts.join(" "), color, url: u });

      // Area fill (gradient under line)
      if (points.length > 1) {
        const areaD =
          pathParts.join(" ") +
          ` L${xPos(points[points.length - 1].date)},${padTop + plotH}` +
          ` L${xPos(points[0].date)},${padTop + plotH} Z`;
        paths.push({ d: areaD, color, url: u, isArea: true });
      }

      // Dots
      points.forEach((p) => {
        dots.push({
          cx: xPos(p.date),
          cy: yPos(p.score),
          color,
          data: p,
        });
      });
    }

    return {
      W,
      H,
      padLeft,
      padTop,
      padBottom,
      plotW,
      plotH,
      gridLines,
      xLabels,
      paths,
      dots,
      colorMap,
      urlsInView,
    };
  }, [data, selectedUrl]);

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <h1 className={styles.heading}>SEO Score History</h1>
        <p className={styles.subheading}>Track how your SEO score changes over time.</p>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          Loading history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className={styles.heading}>SEO Score History</h1>
        <p className={styles.subheading}>Track how your SEO score changes over time.</p>
        <div className={styles.errorCard}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 className={styles.errorTitle}>Failed to load history</h2>
          <p className={styles.errorText}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.reports.length === 0) {
    return (
      <div>
        <h1 className={styles.heading}>SEO Score History</h1>
        <p className={styles.subheading}>Track how your SEO score changes over time.</p>
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p>No scan history yet. Run some SEO scans to see your score trends here.</p>
        </div>
      </div>
    );
  }

  const { stats, regressions, urls: allUrls } = data;

  return (
    <div>
      <h1 className={styles.heading}>SEO Score History</h1>
      <p className={styles.subheading}>Track how your SEO score changes over time. Visualize improvements and identify regressions.</p>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          className={styles.urlSelect}
          value={selectedUrl}
          onChange={(e) => setSelectedUrl(e.target.value)}
        >
          <option value="">All URLs ({allUrls.length})</option>
          {allUrls.map((u) => (
            <option key={u} value={u}>{shortenUrl(u)}</option>
          ))}
        </select>
        <select
          className={styles.rangeSelect}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 6 months</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.statValueGood}`}>{stats.totalScans}</div>
          <div className={styles.statLabel}>Total Scans</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${statScoreClass(stats.avgScore)}`}>{stats.avgScore}</div>
          <div className={styles.statLabel}>Avg Score</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${statScoreClass(stats.bestScore)}`}>{stats.bestScore}</div>
          <div className={styles.statLabel}>Best Score</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${statScoreClass(stats.worstScore)}`}>{stats.worstScore}</div>
          <div className={styles.statLabel}>Worst Score</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${
            stats.trend === "improving" ? styles.trendUp
            : stats.trend === "declining" ? styles.trendDown
            : styles.trendStable
          }`}>
            {stats.trend === "improving" ? "+" : stats.trend === "declining" ? "-" : "="}{" "}
            <span className={styles.trendIcon}>
              {stats.trend === "improving" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              )}
              {stats.trend === "declining" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
              )}
              {stats.trend === "stable" && "Stable"}
              {stats.trend === "improving" && "Improving"}
              {stats.trend === "declining" && "Declining"}
            </span>
          </div>
          <div className={styles.statLabel}>Trend</div>
        </div>
      </div>

      {/* Score Trend Chart */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Score Trend</h2>
        <div className={styles.chartContainer}>
          {chartData ? (
            <div className={styles.chart} onMouseLeave={() => setTooltip(null)}>
              <svg
                className={styles.chartSvg}
                viewBox={`0 0 ${chartData.W} ${chartData.H}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid lines */}
                {chartData.gridLines.map((g) => (
                  <g key={g.label}>
                    <line
                      x1={chartData.padLeft}
                      y1={g.y}
                      x2={chartData.padLeft + chartData.plotW}
                      y2={g.y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray={g.label === 0 ? "none" : "4,4"}
                    />
                    <text
                      x={chartData.padLeft - 8}
                      y={g.y + 4}
                      textAnchor="end"
                      fill="#9ca3af"
                      fontSize="11"
                      fontFamily="inherit"
                    >
                      {g.label}
                    </text>
                  </g>
                ))}

                {/* X-axis labels */}
                {chartData.xLabels.map((xl, i) => (
                  <text
                    key={i}
                    x={xl.x}
                    y={chartData.H - 5}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize="11"
                    fontFamily="inherit"
                  >
                    {xl.label}
                  </text>
                ))}

                {/* Area fills (rendered first, behind lines) */}
                {chartData.paths
                  .filter((p) => p.isArea)
                  .map((p, i) => (
                    <path
                      key={`area-${i}`}
                      d={p.d}
                      fill={p.color}
                      fillOpacity="0.08"
                    />
                  ))}

                {/* Lines */}
                {chartData.paths
                  .filter((p) => !p.isArea)
                  .map((p, i) => (
                    <path
                      key={`line-${i}`}
                      d={p.d}
                      fill="none"
                      stroke={p.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}

                {/* Dots */}
                {chartData.dots.map((dot, i) => (
                  <circle
                    key={i}
                    cx={dot.cx}
                    cy={dot.cy}
                    r="5"
                    fill="#ffffff"
                    stroke={dot.color}
                    strokeWidth="2.5"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      const svgRect = e.currentTarget.closest("svg").getBoundingClientRect();
                      const dotX = (dot.cx / chartData.W) * svgRect.width;
                      const dotY = (dot.cy / chartData.H) * svgRect.height;
                      setTooltip({
                        x: dotX,
                        y: dotY,
                        data: dot.data,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </svg>
              {tooltip && (
                <div
                  className={styles.chartTooltip}
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                  }}
                >
                  <div className={styles.tooltipUrl}>{shortenUrl(tooltip.data.url)}</div>
                  <div>
                    <span className={styles.tooltipScore}>Score: {tooltip.data.score}</span>
                    {" "}
                    <span className={styles.tooltipDate}>{formatDateLong(tooltip.data.date)}</span>
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <span style={{ color: "#dc2626" }}>{tooltip.data.fail}F</span>{" "}
                    <span style={{ color: "#d97706" }}>{tooltip.data.warning}W</span>{" "}
                    <span style={{ color: "#16a34a" }}>{tooltip.data.pass}P</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.chartEmpty}>No data to display</div>
          )}

          {/* Legend for multi-URL view */}
          {chartData && chartData.urlsInView.length > 1 && (
            <div className={styles.chartLegend}>
              {chartData.urlsInView.map((u) => (
                <span key={u} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: chartData.colorMap[u] }} />
                  {shortenUrl(u)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Regressions */}
      {regressions.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Regressions Detected ({regressions.length})
          </h2>
          <div className={styles.regressionList}>
            {regressions.map((r, i) => (
              <div key={i} className={styles.regressionItem}>
                <div className={styles.regressionIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                    <polyline points="17 18 23 18 23 12" />
                  </svg>
                </div>
                <div className={styles.regressionInfo}>
                  <div className={styles.regressionUrl}>{shortenUrl(r.url)}</div>
                  <div className={styles.regressionMeta}>
                    {r.from} → {r.to} on {formatDateLong(r.date)}
                  </div>
                </div>
                <div className={styles.regressionDrop}>-{r.drop} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan History List */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Scan History ({data.reports.length})</h2>
        <div className={styles.historyList}>
          {data.reports.slice().reverse().map((r, i, arr) => {
            // Find previous scan of same URL for change calculation
            const prevSameUrl = arr.slice(i + 1).find((p) => p.url === r.url);
            const change = prevSameUrl ? r.overall_score - prevSameUrl.overall_score : null;

            return (
              <div key={r.id} className={styles.historyItem}>
                <div className={styles.historyDate}>{formatDateLong(r.created_at)}</div>
                <div className={styles.historyUrl}>{shortenUrl(r.url)}</div>
                <div className={styles.severityCounts}>
                  <span className={`${styles.countBadge} ${styles.countFail}`}>{r.fail_count}F</span>
                  <span className={`${styles.countBadge} ${styles.countWarning}`}>{r.warning_count}W</span>
                  <span className={`${styles.countBadge} ${styles.countPass}`}>{r.pass_count}P</span>
                </div>
                <div className={`${styles.historyScore} ${scoreClass(r.overall_score)}`}>
                  {r.overall_score}
                </div>
                <div className={`${styles.historyChange} ${
                  change === null ? styles.changeNeutral
                  : change > 0 ? styles.changeUp
                  : change < 0 ? styles.changeDown
                  : styles.changeNeutral
                }`}>
                  {change === null ? "—" : change > 0 ? `+${change}` : change === 0 ? "±0" : change}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

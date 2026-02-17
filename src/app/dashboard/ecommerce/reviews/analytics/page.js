"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

export default function ReviewAnalyticsPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await projectFetch("/api/ecommerce/reviews/analytics");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Ignore
      }
      setLoading(false);
    }
    load();
  }, [projectFetch]);

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("160px", "28px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.statCard}>
              <div style={b("40%", "28px", "0.5rem")} />
              <div style={b("60%", "12px")} />
            </div>
          ))}
        </div>
        <div className={styles.section}>
          <div style={b("140px", "20px", "1rem")} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.5rem 0" }}>
              <div style={b("50px", "14px")} />
              <div style={{ ...b("60%", "16px"), flex: 1 }} />
              <div style={b("30px", "14px")} />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!data) {
    return <p className={styles.emptyState}>Could not load analytics data.</p>;
  }

  const hasReviews = data.totalReviews > 0;
  const maxDaily = Math.max(...(data.dailyReviews || []).map((d) => d.count), 1);
  const maxRating = Math.max(...Object.values(data.ratingDistribution || {}), 1);
  const maxSource = Math.max(...Object.values(data.sourceBreakdown || {}), 1);

  function formatBarDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function sentimentColor(score) {
    if (score > 0.05) return "var(--color-pass)";
    if (score < -0.05) return "var(--color-critical)";
    return "var(--color-text-secondary)";
  }

  return (
    <>
      <Link href="/dashboard/ecommerce/reviews" className={styles.backLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Reviews
      </Link>

      <h1 className={styles.heading}>Review Analytics</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.totalReviews}</div>
          <div className={styles.statLabel}>Total Reviews</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.avgRating}</div>
          <div className={styles.statLabel}>Average Rating</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.reviewsThisMonth}</div>
          <div className={styles.statLabel}>Reviews This Month</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: sentimentColor(data.avgSentiment) }}>
            {data.avgSentiment > 0 ? "+" : ""}{data.avgSentiment}
          </div>
          <div className={styles.statLabel}>Avg Sentiment</div>
        </div>
      </div>

      {!hasReviews ? (
        <div className={styles.section}>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
            <div className={styles.emptyTitle}>No review data yet</div>
            <div className={styles.emptyDesc}>
              Add reviews from the Reviews page to start seeing analytics data here.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Rating Distribution */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Rating Distribution</h2>
            <p className={styles.sectionDesc}>Breakdown by star rating</p>
            <div className={styles.barChart}>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = data.ratingDistribution[rating] || 0;
                return (
                  <div key={rating} className={styles.barRow}>
                    <span className={styles.barLabel}>{rating} star{rating !== 1 ? "s" : ""}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${(count / maxRating) * 100}%` }}
                      />
                    </div>
                    <span className={styles.barValue}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sentiment Trend */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Sentiment Trend</h2>
            <p className={styles.sectionDesc}>Last 6 months</p>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "var(--color-pass)" }} />
                Positive
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "var(--color-critical)" }} />
                Negative
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "var(--color-text-secondary)" }} />
                Neutral
              </span>
            </div>
            <div className={styles.barChart}>
              {(data.monthlySentiment || []).map((m) => {
                const total = m.positive + m.negative + m.neutral;
                if (total === 0) {
                  return (
                    <div key={m.month} className={styles.barRow}>
                      <span className={styles.barLabel}>{m.month}</span>
                      <div className={styles.barTrack} />
                      <span className={styles.barValue}>0</span>
                    </div>
                  );
                }
                return (
                  <div key={m.month} className={styles.barRow}>
                    <span className={styles.barLabel}>{m.month}</span>
                    <div className={styles.barTrack}>
                      <div className={styles.stackedBar}>
                        {m.positive > 0 && (
                          <div
                            className={styles.stackedPositive}
                            style={{ width: `${(m.positive / total) * 100}%` }}
                            title={`${m.positive} positive`}
                          />
                        )}
                        {m.neutral > 0 && (
                          <div
                            className={styles.stackedNeutral}
                            style={{ width: `${(m.neutral / total) * 100}%` }}
                            title={`${m.neutral} neutral`}
                          />
                        )}
                        {m.negative > 0 && (
                          <div
                            className={styles.stackedNegative}
                            style={{ width: `${(m.negative / total) * 100}%` }}
                            title={`${m.negative} negative`}
                          />
                        )}
                      </div>
                    </div>
                    <span className={styles.barValue}>{total}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Reviews */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Daily Reviews</h2>
            <p className={styles.sectionDesc}>Last 30 days</p>
            <div className={styles.barChart}>
              {(data.dailyReviews || []).map((day) => (
                <div key={day.date} className={styles.barRow}>
                  <span className={styles.barLabel}>{formatBarDate(day.date)}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${(day.count / maxDaily) * 100}%` }}
                    />
                  </div>
                  <span className={styles.barValue}>{day.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Source Breakdown */}
          {Object.keys(data.sourceBreakdown || {}).length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Review Sources</h2>
              <p className={styles.sectionDesc}>Where reviews come from</p>
              <div className={styles.barChart}>
                {Object.entries(data.sourceBreakdown).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                  <div key={source} className={styles.barRow}>
                    <span className={styles.barLabel} style={{ textTransform: "capitalize" }}>{source}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${(count / maxSource) * 100}%` }}
                      />
                    </div>
                    <span className={styles.barValue}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products */}
          {data.topProducts && data.topProducts.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Top Products</h2>
              <p className={styles.sectionDesc}>Most reviewed products</p>
              <div className={styles.productList}>
                {data.topProducts.map((product) => (
                  <div key={product.name} className={styles.productRow}>
                    <div className={styles.productInfo}>
                      <div className={styles.productName}>{product.name}</div>
                      <div className={styles.productMeta}>Avg rating: {product.avgRating} / 5</div>
                    </div>
                    <div className={styles.productStats}>
                      <div className={styles.productCount}>{product.count}</div>
                      <div className={styles.productCountLabel}>reviews</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

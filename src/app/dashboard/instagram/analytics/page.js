"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "../page.module.css";

export default function InstagramAnalyticsPage() {
  const { activeProject } = useProject();
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("projectId", activeProject);
      const query = params.toString();
      const [insightsRes, postsRes] = await Promise.all([
        fetch(`/api/instagram/insights${query ? `?${query}` : ""}`),
        fetch(`/api/instagram/posts${query ? `?${query}` : ""}`),
      ]);

      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data.insights || []);
        setSummary(data.summary);
      } else {
        const data = await insightsRes.json();
        setError(data.error || "Failed to load insights");
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const posts = postsData.posts || [];
        // Top 10 by engagement
        const sorted = [...posts].sort((a, b) => b.engagement - a.engagement);
        setTopPosts(sorted.slice(0, 10));
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAnalytics();
  }, [activeProject]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("200px", "28px", "0.5rem")} />
        <div style={b("350px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <table className={styles.table}>
            <thead><tr>{["Date","Impressions","Reach","Followers","Profile Views"].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3,4,5,6,7].map(i => <tr key={i}>{[1,2,3,4,5].map(j => <td key={j}><div style={b("60%", "14px")} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className={styles.heading}>Instagram Analytics</h1>
          <p className={styles.subheading}>Account-level insights for the last 30 days.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadAnalytics}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Summary Stats */}
      {summary && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Impressions (30d)</div>
            <div className={styles.statValue}>{summary.totalImpressions.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Reach (30d)</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{summary.totalReach.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Follower Growth</div>
            <div className={styles.statValue} style={{ color: summary.followerGrowth >= 0 ? "var(--color-pass)" : "var(--color-critical)" }}>
              {summary.followerGrowth >= 0 ? "+" : ""}{summary.followerGrowth.toLocaleString()}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Avg Daily Profile Views</div>
            <div className={styles.statValue}>{summary.avgDailyProfileViews.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Daily Insights Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Daily Insights ({insights.length} days)</h2>
        </div>

        {insights.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <p>No insights data available yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Impressions</th>
                  <th>Reach</th>
                  <th>Follower Count</th>
                  <th>Profile Views</th>
                </tr>
              </thead>
              <tbody>
                {insights.map((day) => (
                  <tr key={day.date}>
                    <td style={{ fontWeight: 500 }}>{new Date(day.date + "T00:00:00").toLocaleDateString()}</td>
                    <td>{day.impressions.toLocaleString()}</td>
                    <td>{day.reach.toLocaleString()}</td>
                    <td>{day.follower_count.toLocaleString()}</td>
                    <td>{day.profile_views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Performing Posts */}
      {topPosts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Performing Posts</h2>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Likes</th>
                  <th>Comments</th>
                  <th>Reach</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {(post.mediaType === "VIDEO" ? post.thumbnailUrl : post.mediaUrl) ? (
                          <img
                            src={post.mediaType === "VIDEO" ? (post.thumbnailUrl || post.mediaUrl) : post.mediaUrl}
                            alt=""
                            style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}
                          />
                        ) : (
                          <div style={{ width: "40px", height: "40px", background: "var(--color-bg)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--color-border)" }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                            {post.caption ? (post.caption.length > 50 ? post.caption.slice(0, 50) + "..." : post.caption) : "No caption"}
                          </div>
                          {post.permalink && (
                            <a href={post.permalink} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--color-accent)" }} onClick={(e) => e.stopPropagation()}>
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.mediaTypeBadge} ${
                        post.mediaType === "IMAGE" ? styles.mediaTypeImage :
                        post.mediaType === "VIDEO" ? styles.mediaTypeVideo :
                        styles.mediaTypeCarousel
                      }`}>
                        {post.mediaType === "CAROUSEL_ALBUM" ? "Carousel" : post.mediaType === "IMAGE" ? "Image" : "Video"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>{new Date(post.timestamp).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>{post.likeCount.toLocaleString()}</td>
                    <td>{post.commentsCount.toLocaleString()}</td>
                    <td>{post.reach.toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: "var(--color-accent)" }}>{post.engagement.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

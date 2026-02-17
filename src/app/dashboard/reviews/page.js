"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";

function Stars({ rating }) {
  return (
    <span className={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i <= rating ? "#ffaa00" : "none"}
          stroke={i <= rating ? "#ffaa00" : "var(--color-border)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

function SentimentBadge({ sentiment }) {
  const cls =
    sentiment === "positive"
      ? styles.sentimentPositive
      : sentiment === "negative"
        ? styles.sentimentNegative
        : styles.sentimentNeutral;
  return <span className={cls}>{sentiment}</span>;
}

function StatusBadge({ status }) {
  const map = {
    pending: styles.statusDraft,
    flagged: styles.statusArchived,
    responded: styles.statusActive,
    resolved: styles.statusActive,
  };
  const cls = map[status] || styles.statusDraft;
  const colorMap = {
    flagged: { background: "rgba(255, 68, 68, 0.15)", color: "var(--color-critical)" },
  };
  const extra = colorMap[status] || {};
  return (
    <span className={cls} style={extra}>
      {status}
    </span>
  );
}

export default function GoogleReviewsPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Place ID state
  const [placeId, setPlaceId] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("source", "google");
        const res = await projectFetch(`/api/ecommerce/reviews?${params.toString()}`);
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setStats(data.stats);
        } else {
          const data = await res.json();
          setError(data.error || "Failed to load reviews");
        }
      } catch {
        if (active) setError("Network error");
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [activeProjectId, projectFetch]);

  async function loadReviews() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("source", "google");
      const res = await projectFetch(`/api/ecommerce/reviews?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load reviews");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function handleImportReviews() {
    if (!placeId.trim()) return;
    setImporting(true);
    setImportResult(null);
    setError("");
    try {
      const res = await fetch("/api/places/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: placeId.trim(), project_id: activeProjectId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        loadReviews();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to import reviews");
      }
    } catch {
      setError("Network error");
    }
    setImporting(false);
  }

  async function handleRespond(reviewId) {
    if (!responseText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ecommerce/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_text: responseText }),
      });
      if (res.ok) {
        setResponseText("");
        setExpandedId(null);
        loadReviews();
      }
    } catch {
      setError("Network error");
    }
    setSubmitting(false);
  }

  async function handleDelete(reviewId) {
    try {
      const res = await fetch(`/api/ecommerce/reviews/${reviewId}`, { method: "DELETE" });
      if (res.ok) {
        loadReviews();
      }
    } catch {
      setError("Network error");
    }
  }

  async function handleStatusChange(reviewId, newStatus) {
    try {
      const res = await fetch(`/api/ecommerce/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadReviews();
      }
    } catch {
      setError("Network error");
    }
  }

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (r.reviewer_name || "").toLowerCase().includes(q) ||
      (r.title || "").toLowerCase().includes(q) ||
      (r.body || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSentiment = sentimentFilter === "all" || r.sentiment === sentimentFilter;
    const matchesRating = ratingFilter === "all" || r.rating === parseInt(ratingFilter);
    return matchesSearch && matchesStatus && matchesSentiment && matchesRating;
  });

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("180px", "28px", "0.5rem")} />
        <div style={b("360px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Rating", "Reviewer", "Sentiment", "Status", "Date"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1, 2, 3, 4, 5].map((i) => <tr key={i}>{[1, 2, 3, 4, 5].map((j) => <td key={j}><div style={b(j === 1 ? "70px" : "60%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Google Reviews</h1>
      <p className={styles.subheading}>
        Import and manage reviews from Google Maps using a Place ID.
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && (
        <div className={styles.success} onClick={() => setSuccessMsg("")} style={{ cursor: "pointer" }}>
          {successMsg}
        </div>
      )}

      {/* Place ID Import Section */}
      <div className={styles.placeIdSection}>
        <div className={styles.placeIdCard}>
          <div className={styles.placeIdCardHeader}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <h3 className={styles.placeIdCardTitle}>Import Google Reviews</h3>
          </div>
          <p className={styles.placeIdCardDesc}>
            Enter a Google Place ID to import reviews. You can find it using the{" "}
            <a
              href="https://developers.google.com/maps/documentation/places/web-service/place-id"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-accent)", textDecoration: "none" }}
            >
              Place ID Finder
            </a>.
          </p>
          <div className={styles.placeIdInputRow}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="e.g. ChIJux-1SpJnUjoRQTCm4jFcCeY"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleImportReviews(); }}
            />
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleImportReviews}
              disabled={importing || !placeId.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {importing ? "Importing..." : "Import Reviews"}
            </button>
          </div>
        </div>
      </div>

      {importResult && (
        <div className={styles.importResult}>
          Imported {importResult.imported} review{importResult.imported !== 1 ? "s" : ""}
          {importResult.flagged > 0 && `, ${importResult.flagged} flagged`}
          {importResult.skipped > 0 && `, ${importResult.skipped} skipped (duplicates)`}
          {" "}from {importResult.totalFetched} total Google review{importResult.totalFetched !== 1 ? "s" : ""}.
        </div>
      )}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Reviews</div>
            <div className={styles.statValue}>{stats.totalReviews}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Avg Rating</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.avgRating}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Flagged</div>
            <div className={styles.statValue} style={{ color: stats.flaggedCount > 0 ? "var(--color-critical)" : undefined }}>
              {stats.flaggedCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Negative</div>
            <div className={styles.statValue} style={{ color: stats.negativeCount > 0 ? "var(--color-warning)" : undefined }}>
              {stats.negativeCount}
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Google Reviews ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadReviews}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search reviews..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="responded">Responded</option>
            <option value="resolved">Resolved</option>
          </select>
          <select className={styles.filterSelect} value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value)}>
            <option value="all">All Sentiment</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
          <select className={styles.filterSelect} value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p>No Google reviews found. Enter a Place ID above to import reviews.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Reviewer</th>
                  <th>Sentiment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((review) => (
                  <tr
                    key={review.id}
                    className={review.status === "flagged" ? styles.flaggedRow : undefined}
                  >
                    <td><Stars rating={review.rating} /></td>
                    <td>
                      <div>{review.reviewer_name}</div>
                      {review.title && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.125rem" }}>
                          {review.title}
                        </div>
                      )}
                      {review.reviewer_email && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          {review.reviewer_email}
                        </div>
                      )}
                    </td>
                    <td><SentimentBadge sentiment={review.sentiment} /></td>
                    <td><StatusBadge status={review.status} /></td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {formatDate(review.review_date || review.created_at)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => {
                            setExpandedId(expandedId === review.id ? null : review.id);
                            setResponseText(review.response_text || "");
                          }}
                          title="Respond"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                        {review.status === "flagged" && (
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => handleStatusChange(review.id, "resolved")}
                            title="Resolve"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-pass)" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => handleDelete(review.id)}
                          title="Delete"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                      {expandedId === review.id && (
                        <div className={styles.expandedRow} style={{ marginTop: "0.75rem" }}>
                          {review.body && (
                            <p style={{ fontSize: "0.85rem", color: "var(--color-text)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                              &quot;{review.body}&quot;
                            </p>
                          )}
                          {review.response_text && (
                            <div className={styles.responseExisting}>
                              <strong style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Your Response:</strong>
                              <p style={{ margin: "0.25rem 0 0" }}>{review.response_text}</p>
                            </div>
                          )}
                          <div className={styles.responseArea}>
                            <textarea
                              className={styles.textarea}
                              placeholder="Write a response..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              rows={3}
                              style={{ minHeight: "60px" }}
                            />
                            <button
                              className={`${styles.btn} ${styles.btnPrimary}`}
                              onClick={() => handleRespond(review.id)}
                              disabled={submitting || !responseText.trim()}
                              style={{ alignSelf: "flex-end" }}
                            >
                              {submitting ? "Saving..." : "Save Response"}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

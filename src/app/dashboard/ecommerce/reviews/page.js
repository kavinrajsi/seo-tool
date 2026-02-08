"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../page.module.css";

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

function SourceBadge({ source }) {
  const isGoogle = source === "google";
  return (
    <span className={isGoogle ? styles.sourceBadge : `${styles.sourceBadge} ${styles.sourceBadgeManual}`}>
      {isGoogle && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      {source || "manual"}
    </span>
  );
}

export default function ReviewsPage() {
  const searchParams = useSearchParams();
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

  // GBP state
  const [gbpStatus, setGbpStatus] = useState(null);
  const [gbpLoading, setGbpLoading] = useState(true);
  const [gbpLocations, setGbpLocations] = useState([]);
  const [gbpLocationsLoading, setGbpLocationsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [importLocationName, setImportLocationName] = useState("");
  const [importing, setImporting] = useState(false);

  async function loadReviews() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ecommerce/reviews");
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

  async function loadGbpStatus() {
    setGbpLoading(true);
    try {
      const res = await fetch("/api/gbp/status");
      if (res.ok) {
        const data = await res.json();
        setGbpStatus(data);
      }
    } catch {
      // Non-critical
    }
    setGbpLoading(false);
  }

  useEffect(() => {
    loadReviews();
    loadGbpStatus();
  }, []);

  // Handle search params for connection result
  useEffect(() => {
    if (searchParams.get("gbp_connected") === "true") {
      setSuccessMsg("Google Business Profile connected successfully!");
      loadGbpStatus();
      window.history.replaceState({}, "", "/dashboard/ecommerce/reviews");
    }
    if (searchParams.get("gbp_error")) {
      setError(`Google Business Profile connection failed: ${searchParams.get("gbp_error")}`);
      window.history.replaceState({}, "", "/dashboard/ecommerce/reviews");
    }
  }, [searchParams]);

  async function loadGbpLocations(refresh = false) {
    setGbpLocationsLoading(true);
    setError("");
    try {
      const url = refresh ? "/api/gbp/locations?refresh=true" : "/api/gbp/locations";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGbpLocations(data.locations || []);
        if (data.selectedLocationId) {
          setSelectedLocation(data.selectedLocationId);
        }
      } else {
        const data = await res.json();
        const msg = data.detail
          ? `${data.error}: ${data.detail}`
          : data.error || "Failed to load locations";
        setError(msg);
      }
    } catch {
      setError("Failed to load locations");
    }
    setGbpLocationsLoading(false);
  }

  async function handleSaveLocation() {
    if (!selectedLocation) return;
    const loc = gbpLocations.find((l) => l.locationId === selectedLocation);
    if (!loc) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/gbp/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: loc.accountId,
          locationId: loc.locationId,
          locationName: loc.locationName,
        }),
      });
      if (res.ok) {
        setSuccessMsg("Location saved successfully!");
        loadGbpStatus();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save location");
      }
    } catch {
      setError("Network error");
    }
    setSubmitting(false);
  }

  async function handleImportReviews(locationId = "", locationName = "") {
    setImporting(true);
    setImportResult(null);
    setImportLocationName(locationName || "");
    setError("");
    try {
      const url = locationId ? `/api/gbp/reviews?locationId=${encodeURIComponent(locationId)}` : "/api/gbp/reviews";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        loadReviews();
        loadGbpStatus();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to import reviews");
      }
    } catch {
      setError("Network error");
    }
    setImporting(false);
  }

  async function handleDisconnectGbp() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/gbp/disconnect", { method: "POST" });
      if (res.ok) {
        setGbpStatus({ connected: false });
        setGbpLocations([]);
        setImportResult(null);
        setSuccessMsg("Google Business Profile disconnected.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to disconnect");
      }
    } catch {
      setError("Network error");
    }
    setSubmitting(false);
  }

  async function handleRespond(reviewId) {
    if (!responseText.trim()) return;
    setSubmitting(true);
    try {
      // Find the review to check if it's a Google review
      const review = reviews.find((r) => r.id === reviewId);
      const isGoogleReview = review?.source === "google" && review?.google_review_id;

      // If it's a Google review, also push the reply to Google
      if (isGoogleReview) {
        const gbpRes = await fetch("/api/gbp/reviews/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewId,
            googleReviewId: review.google_review_id,
            replyText: responseText,
          }),
        });
        if (!gbpRes.ok) {
          const data = await gbpRes.json();
          setError(data.error || "Failed to push reply to Google");
          setSubmitting(false);
          return;
        }
      }

      // Update local review
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
      (r.product_title || "").toLowerCase().includes(q) ||
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
        <div style={b("140px", "28px", "0.5rem")} />
        <div style={b("300px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Rating", "Product", "Reviewer", "Sentiment", "Status", "Date"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1, 2, 3, 4, 5].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6].map((j) => <td key={j}><div style={b(j === 1 ? "70px" : "60%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Reviews</h1>
      <p className={styles.subheading}>
        Monitor product reviews, sentiment, and respond to customers.
        {" "}
        <Link href="/dashboard/ecommerce/reviews/analytics" style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: 500 }}>
          View Analytics →
        </Link>
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && (
        <div className={styles.success} onClick={() => setSuccessMsg("")} style={{ cursor: "pointer" }}>
          {successMsg}
        </div>
      )}

      {/* Google Business Profile Section */}
      {!gbpLoading && (
        <div className={styles.gbpSection}>
          <div className={styles.gbpCard}>
            <div className={styles.gbpCardHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <h3 className={styles.gbpCardTitle}>Google Business Profile</h3>
            </div>

            {!gbpStatus?.connected ? (
              <>
                <p className={styles.gbpCardDesc}>
                  Connect your Google Business Profile to import reviews from Google Maps and respond to them directly.
                </p>
                <a href="/api/gbp/connect" className={`${styles.btn} ${styles.btnPrimary}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Connect Google Business Profile
                </a>
              </>
            ) : !gbpStatus.locationId ? (
              <>
                <p className={styles.gbpCardDesc}>
                  Connected as <strong>{gbpStatus.googleEmail}</strong>. Select a business location to import reviews from.
                </p>
                {gbpLocations.length === 0 && !gbpLocationsLoading ? (
                  <div className={styles.gbpActions}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={loadGbpLocations}
                      disabled={gbpLocationsLoading}
                    >
                      {gbpLocationsLoading ? "Loading..." : "Load Locations"}
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={handleDisconnectGbp}
                      disabled={submitting}
                      style={{ marginLeft: "auto" }}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className={styles.gbpLocationSelect}>
                    <select
                      className={styles.filterSelect}
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      disabled={gbpLocationsLoading}
                    >
                      <option value="">Select a location...</option>
                      {gbpLocations.map((loc) => (
                        <option key={loc.locationId} value={loc.locationId}>
                          {loc.locationName}{loc.address ? ` — ${loc.address}` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={handleSaveLocation}
                      disabled={submitting || !selectedLocation}
                    >
                      {submitting ? "Saving..." : "Save Location"}
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => loadGbpLocations(true)}
                      disabled={gbpLocationsLoading}
                      title="Refresh locations from Google"
                    >
                      {gbpLocationsLoading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={handleDisconnectGbp}
                      disabled={submitting}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.gbpConnected}>
                <div className={styles.gbpConnectedInfo}>
                  <span className={styles.gbpConnectedLabel}>Location</span>
                  <span className={styles.gbpConnectedValue}>{gbpStatus.locationName}</span>
                  {gbpStatus.lastSyncedAt && (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.125rem" }}>
                      Last synced: {formatDate(gbpStatus.lastSyncedAt)}
                    </span>
                  )}
                </div>
                <div className={styles.gbpActions}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleImportReviews}
                    disabled={importing}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {importing ? "Importing..." : "Import Google Reviews"}
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={handleDisconnectGbp}
                    disabled={submitting}
                  >
                    Disconnect
                  </button>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
                    Import reviews from a different location
                  </div>
                  {gbpLocations.length === 0 ? (
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={loadGbpLocations}
                      disabled={gbpLocationsLoading}
                    >
                      {gbpLocationsLoading ? "Loading..." : "Load Locations"}
                    </button>
                  ) : (
                    <div className={styles.gbpLocationSelect}>
                      <select
                        className={styles.filterSelect}
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        disabled={gbpLocationsLoading}
                      >
                        <option value="">Select a location...</option>
                        {gbpLocations.map((loc) => (
                          <option key={loc.locationId} value={loc.locationId}>
                            {loc.locationName}{loc.address ? ` — ${loc.address}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => {
                          const loc = gbpLocations.find((l) => l.locationId === selectedLocation);
                          handleImportReviews(selectedLocation, loc?.locationName || "");
                        }}
                        disabled={importing || !selectedLocation}
                      >
                        {importing ? "Importing..." : "Import for Location"}
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => loadGbpLocations(true)}
                        disabled={gbpLocationsLoading}
                        title="Refresh locations from Google"
                      >
                        {gbpLocationsLoading ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {importResult && (
        <div className={styles.importResult}>
          Imported {importResult.imported} review{importResult.imported !== 1 ? "s" : ""}
          {importResult.flagged > 0 && `, ${importResult.flagged} flagged`}
          {importResult.skipped > 0 && `, ${importResult.skipped} skipped (duplicates)`}
          {" "}from {importResult.totalFetched} total Google review{importResult.totalFetched !== 1 ? "s" : ""}.
          {importLocationName && ` Location: ${importLocationName}.`}
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
          <h2 className={styles.sectionTitle}>All Reviews ({filtered.length})</h2>
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
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <p>No reviews found. Add reviews manually or connect Google Business Profile to import them.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Product</th>
                  <th>Reviewer</th>
                  <th>Source</th>
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
                      <div style={{ fontWeight: 500 }}>{review.product_title || "-"}</div>
                      {review.title && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.125rem" }}>
                          {review.title}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{review.reviewer_name}</div>
                      {review.reviewer_email && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          {review.reviewer_email}
                        </div>
                      )}
                    </td>
                    <td><SourceBadge source={review.source} /></td>
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
                              placeholder={review.source === "google" ? "Write a response (will be posted to Google)..." : "Write a response..."}
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
                              {submitting ? "Sending..." : review.source === "google" ? "Send to Google" : "Send Response"}
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

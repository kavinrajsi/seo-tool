"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ecommerce/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load collections");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getTypeBadge(type) {
    switch (type) {
      case "smart":
        return styles.statusDraft;
      case "custom":
        return styles.statusActive;
      default:
        return styles.statusDraft;
    }
  }

  const filteredCollections = collections.filter((c) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (c.title?.toLowerCase() || "").includes(searchLower) ||
      (c.handle?.toLowerCase() || "").includes(searchLower);

    const matchesType = typeFilter === "all" || c.collection_type === typeFilter;

    return matchesSearch && matchesType;
  });

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("160px", "28px", "0.5rem")} />
        <div style={b("320px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("200px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Collection","Handle","Type","Published","Updated","Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j}><div style={b(j===1?"70%":"50%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Collections</h1>
      <p className={styles.subheading}>View Shopify collections synced via webhooks.</p>

      {error && <div className={styles.error}>{error}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Collections</div>
            <div className={styles.statValue}>{stats.totalCollections}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Custom</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.customCollections}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Smart</div>
            <div className={styles.statValue}>{stats.smartCollections}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Collections ({filteredCollections.length})</h2>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={loadCollections}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by title or handle..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="custom">Custom</option>
            <option value="smart">Smart</option>
          </select>
        </div>

        {filteredCollections.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p>No collections found. Collections will appear here when received from Shopify.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Collection</th>
                  <th>Handle</th>
                  <th>Type</th>
                  <th>Published</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.map((collection) => (
                  <tr key={collection.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {collection.image_url ? (
                          <img
                            src={collection.image_url}
                            alt={collection.title}
                            style={{
                              width: "40px",
                              height: "40px",
                              objectFit: "cover",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--color-border)"
                            }}
                          />
                        ) : (
                          <div style={{
                            width: "40px",
                            height: "40px",
                            background: "var(--color-bg-secondary)",
                            borderRadius: "var(--radius-sm)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid var(--color-border)"
                          }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                          </div>
                        )}
                        <div style={{ fontWeight: 500 }}>{collection.title}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                      /{collection.handle || "-"}
                    </td>
                    <td>
                      <span className={`${styles.itemStatus} ${getTypeBadge(collection.collection_type)}`}>
                        {collection.collection_type || "custom"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>{formatDate(collection.published_at)}</td>
                    <td style={{ fontSize: "0.875rem" }}>{formatDate(collection.updated_at_shopify)}</td>
                    <td>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => setSelectedCollection(collection)}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCollection(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedCollection.title}</h2>
              <button
                className={styles.modalClose}
                onClick={() => setSelectedCollection(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: "grid", gap: "1.5rem" }}>
                {/* Collection Image + Type */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  {selectedCollection.image_url && (
                    <img
                      src={selectedCollection.image_url}
                      alt={selectedCollection.title}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)"
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span className={`${styles.itemStatus} ${getTypeBadge(selectedCollection.collection_type)}`}>
                        {selectedCollection.collection_type || "custom"}
                      </span>
                    </div>
                    {selectedCollection.handle && (
                      <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
                        /{selectedCollection.handle}
                      </div>
                    )}
                    {selectedCollection.body_html && (
                      <div
                        style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", maxHeight: "80px", overflow: "hidden" }}
                        dangerouslySetInnerHTML={{ __html: selectedCollection.body_html }}
                      />
                    )}
                  </div>
                </div>

                {/* Overview */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "1rem",
                  padding: "1rem",
                  background: "var(--color-bg)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)"
                }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Type</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{selectedCollection.collection_type || "custom"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Sort Order</div>
                    <div style={{ fontSize: "0.875rem" }}>{selectedCollection.sort_order || "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Published</div>
                    <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCollection.published_at)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Scope</div>
                    <div style={{ fontSize: "0.875rem" }}>{selectedCollection.published_scope || "-"}</div>
                  </div>
                </div>

                {/* Smart Collection Rules */}
                {selectedCollection.rules && selectedCollection.rules.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Rules ({selectedCollection.disjunctive ? "Products match any condition" : "Products match all conditions"})
                    </h3>
                    <div style={{
                      padding: "1rem",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      display: "grid",
                      gap: "0.5rem"
                    }}>
                      {selectedCollection.rules.map((rule, idx) => (
                        <div key={idx} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          padding: "0.5rem",
                          background: "var(--color-bg-secondary)",
                          borderRadius: "var(--radius-sm)"
                        }}>
                          <code style={{ fontSize: "0.75rem", color: "var(--color-accent)" }}>{rule.column}</code>
                          <span style={{ color: "var(--color-text-secondary)" }}>{rule.relation}</span>
                          <span style={{ fontWeight: 500 }}>{rule.condition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* System Info */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    System Information
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Shopify ID</div>
                      <code style={{ fontSize: "0.75rem" }}>{selectedCollection.shopify_id}</code>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Shop Domain</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCollection.shop_domain}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Created</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCollection.created_at_shopify)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Last Updated</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCollection.updated_at_shopify)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Last Synced</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCollection.synced_at)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setSelectedCollection(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

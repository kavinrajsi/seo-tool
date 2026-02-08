"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("title");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ecommerce/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load products");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  function formatPrice(price) {
    if (!price) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(parseFloat(price));
  }

  function getStatusBadge(status) {
    switch (status) {
      case "active":
        return styles.statusActive;
      case "draft":
        return styles.statusDraft;
      case "archived":
        return styles.statusArchived;
      default:
        return styles.statusDraft;
    }
  }

  const filteredProducts = products.filter((p) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (p.title?.toLowerCase() || "").includes(searchLower) ||
      (p.tags?.toLowerCase() || "").includes(searchLower);

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "title":
        return dir * (a.title || "").localeCompare(b.title || "");
      case "variant_count":
        return dir * ((a.variant_count || 1) - (b.variant_count || 1));
      case "total_inventory":
        return dir * ((a.total_inventory || 0) - (b.total_inventory || 0));
      default:
        return 0;
    }
  });

  function StatusIcon({ status }) {
    switch (status) {
      case "active":
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" title="Active">
            <circle cx="7" cy="7" r="6" fill="var(--color-pass)" />
          </svg>
        );
      case "draft":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="Draft">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        );
      case "archived":
      case "inactive":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="Inactive">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        );
      default:
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" title="Unlisted">
            <circle cx="7" cy="7" r="5.5" stroke="var(--color-text-secondary)" strokeWidth="1.5" />
          </svg>
        );
    }
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: "4px" }}>↕</span>;
    return <span style={{ marginLeft: "4px" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
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
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["","Product","Price","Variants","Inventory"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5].map(j => <td key={j}><div style={b(j===1?"14px":j===2?"70%":"50%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Products</h1>
      <p className={styles.subheading}>View Shopify products synced via webhooks.</p>

      {error && <div className={styles.error}>{error}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Products</div>
            <div className={styles.statValue}>{stats.totalProducts}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.activeProducts}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Draft</div>
            <div className={styles.statValue}>{stats.draftProducts}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Inventory</div>
            <div className={styles.statValue}>{stats.totalInventory}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>All Products ({filteredProducts.length})</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <svg width="10" height="10" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="var(--color-pass)" /></svg>
                Active
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                Draft
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--color-text-secondary)" strokeWidth="1.5" /></svg>
                Unlisted
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-critical)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                Inactive
              </span>
            </div>
          </div>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={loadProducts}
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
            placeholder="Search by title or tags..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="unlisted">Unlisted</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <p>No products found. Products will appear here when received from Shopify.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th onClick={() => toggleSort("title")} style={{ cursor: "pointer", userSelect: "none" }}>Product<SortIcon field="title" /></th>
                  <th>Price</th>
                  <th>Variants</th>
                  <th onClick={() => toggleSort("total_inventory")} style={{ cursor: "pointer", userSelect: "none" }}>Inventory<SortIcon field="total_inventory" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => router.push(`/dashboard/ecommerce/products/${product.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ textAlign: "center", verticalAlign: "middle" }} title={product.status || "active"}>
                      <StatusIcon status={product.status} />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
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
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 500 }}>{product.title}</div>
                          {product.handle && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              /{product.handle}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{formatPrice(product.price)}</td>
                    <td>
                      {product.variants && product.variants.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {product.variants.map((v, i) => (
                            <div
                              key={v.id || i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "0.5rem",
                                padding: "0.25rem 0.5rem",
                                background: "var(--color-bg)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.75rem",
                              }}
                            >
                              <span style={{ color: "var(--color-text)", fontWeight: 500 }}>
                                {v.title === "Default Title" ? "Default" : v.title}
                              </span>
                              <span style={{
                                whiteSpace: "nowrap",
                                color: v.inventory_management ? "var(--color-pass)" : "var(--color-text-secondary)",
                                fontSize: "0.7rem",
                              }}>
                                {v.inventory_management ? "Tracked" : "Not tracked"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                          No variants
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{product.total_inventory || 0}</td>
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

"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function CartsPage() {
  const [carts, setCarts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCart, setSelectedCart] = useState(null);

  useEffect(() => {
    loadCarts();
  }, []);

  async function loadCarts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ecommerce/carts");
      if (res.ok) {
        const data = await res.json();
        setCarts(data.carts || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load carts");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatCurrency(amount, currency = "INR") {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(amount));
  }

  function getTimeSince(dateStr) {
    if (!dateStr) return "-";
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  const filteredCarts = carts.filter((c) => {
    const searchLower = search.toLowerCase();
    return (
      (c.shopify_token?.toLowerCase() || "").includes(searchLower) ||
      (c.note?.toLowerCase() || "").includes(searchLower)
    );
  });

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("80px", "28px", "0.5rem")} />
        <div style={b("280px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("160px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Cart Token","Items","Total","Currency","Last Updated","Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j}><div style={b(j===1?"70%":"50%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Carts</h1>
      <p className={styles.subheading}>View active shopping carts from your store.</p>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Carts</div>
            <div className={styles.statValue}>{stats.totalCarts}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Items</div>
            <div className={styles.statValue}>{stats.totalItems}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Value</div>
            <div className={`${styles.statValue} ${styles.accent}`}>₹{stats.totalValue}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Avg Cart Value</div>
            <div className={styles.statValue}>₹{stats.avgCartValue}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Carts ({filteredCarts.length})</h2>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={loadCarts}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by token or note..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredCarts.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <p>No carts found. Carts will appear here when received from Shopify.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cart Token</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Currency</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCarts.map((cart) => (
                  <tr key={cart.id}>
                    <td>
                      <code style={{ fontSize: "0.75rem" }}>
                        {cart.shopify_token?.slice(0, 16)}...
                      </code>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>
                      {cart.item_count || 0}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {formatCurrency(cart.total_price, cart.currency)}
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>{cart.currency || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span title={formatDate(cart.updated_at_shopify)}>
                        {getTimeSince(cart.updated_at_shopify)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => setSelectedCart(cart)}
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

      {/* Cart Detail Modal */}
      {selectedCart && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCart(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Cart Details</h2>
              <button
                className={styles.modalClose}
                onClick={() => setSelectedCart(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Cart Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <span className={`${styles.itemStatus} ${styles.statusActive}`}>
                  {selectedCart.item_count || 0} items
                </span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                  Last updated: {formatDate(selectedCart.updated_at_shopify)}
                </span>
              </div>

              <div style={{ display: "grid", gap: "1.5rem" }}>
                {/* Cart Summary */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Cart Summary
                  </h3>
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
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Token</div>
                      <code style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                        {selectedCart.shopify_token}
                      </code>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Total Price</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-accent)" }}>
                        {formatCurrency(selectedCart.total_price, selectedCart.currency)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Original Price</div>
                      <div style={{ fontSize: "0.875rem" }}>
                        {formatCurrency(selectedCart.original_total_price, selectedCart.currency)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Discount</div>
                      <div style={{ fontSize: "0.875rem", color: "var(--color-accent)" }}>
                        {selectedCart.total_discount && parseFloat(selectedCart.total_discount) > 0
                          ? `-${formatCurrency(selectedCart.total_discount, selectedCart.currency)}`
                          : "-"
                        }
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Total Weight</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCart.total_weight || 0}g</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Requires Shipping</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCart.requires_shipping ? "Yes" : "No"}</div>
                    </div>
                  </div>
                </div>

                {/* Note */}
                {selectedCart.note && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Note
                    </h3>
                    <div style={{
                      padding: "1rem",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.875rem"
                    }}>
                      {selectedCart.note}
                    </div>
                  </div>
                )}

                {/* Attributes */}
                {selectedCart.attributes && Object.keys(selectedCart.attributes).length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Attributes
                    </h3>
                    <div style={{
                      padding: "1rem",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)"
                    }}>
                      <pre style={{ fontSize: "0.75rem", margin: 0, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(selectedCart.attributes, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Line Items ({selectedCart.line_items_count || 0})
                  </h3>
                  <div style={{
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    {selectedCart.line_items && selectedCart.line_items.length > 0 ? (
                      <table style={{ width: "100%", fontSize: "0.875rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <th style={{ textAlign: "left", padding: "0.5rem 0", fontWeight: 500 }}>Product</th>
                            <th style={{ textAlign: "center", padding: "0.5rem 0", fontWeight: 500 }}>Qty</th>
                            <th style={{ textAlign: "right", padding: "0.5rem 0", fontWeight: 500 }}>Price</th>
                            <th style={{ textAlign: "right", padding: "0.5rem 0", fontWeight: 500 }}>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCart.line_items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                              <td style={{ padding: "0.75rem 0" }}>
                                <div style={{ fontWeight: 500 }}>{item.title}</div>
                                {item.variant_title && (
                                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                                    {item.variant_title}
                                  </div>
                                )}
                                {item.sku && (
                                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                                    SKU: {item.sku}
                                  </div>
                                )}
                                {item.vendor && (
                                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                                    Vendor: {item.vendor}
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: "center", padding: "0.75rem 0" }}>{item.quantity}</td>
                              <td style={{ textAlign: "right", padding: "0.75rem 0" }}>
                                {formatCurrency(item.price, selectedCart.currency)}
                              </td>
                              <td style={{ textAlign: "right", padding: "0.75rem 0", fontWeight: 500 }}>
                                {formatCurrency(item.line_price, selectedCart.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="3" style={{ textAlign: "right", padding: "0.75rem 0", fontWeight: 600 }}>
                              Total
                            </td>
                            <td style={{ textAlign: "right", padding: "0.75rem 0", fontWeight: 600, color: "var(--color-accent)" }}>
                              {formatCurrency(selectedCart.total_price, selectedCart.currency)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <span style={{ color: "var(--color-text-secondary)" }}>No line items</span>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Timestamps
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
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Created (Shopify)</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCart.created_at_shopify)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Updated (Shopify)</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCart.updated_at_shopify)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Last Synced</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCart.synced_at)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setSelectedCart(null)}
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

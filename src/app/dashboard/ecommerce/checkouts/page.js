"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "../page.module.css";

export default function CheckoutsPage() {
  const { activeProject } = useProject();
  const [checkouts, setCheckouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCheckout, setSelectedCheckout] = useState(null);

  useEffect(() => {
    loadCheckouts();
  }, [activeProject]);

  async function loadCheckouts() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("projectId", activeProject);
      const query = params.toString();
      const res = await fetch(`/api/ecommerce/checkouts${query ? `?${query}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setCheckouts(data.checkouts || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load checkouts");
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

  function getStatusBadge(checkout) {
    if (checkout.completed_at) {
      return { label: "Completed", className: styles.statusActive };
    }
    return { label: "Abandoned", className: styles.statusArchived };
  }

  const filteredCheckouts = checkouts.filter((c) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (c.email?.toLowerCase() || "").includes(searchLower) ||
      (c.name?.toLowerCase() || "").includes(searchLower) ||
      (c.shopify_token?.toLowerCase() || "").includes(searchLower);

    const isCompleted = !!c.completed_at;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "abandoned" && !isCompleted) ||
      (statusFilter === "completed" && isCompleted);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("140px", "28px", "0.5rem")} />
        <div style={b("280px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("200px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Date","Customer","Email","Items","Total","Status","Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6,7].map(j => <td key={j}><div style={b(j===3?"70%":"50%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Checkouts</h1>
      <p className={styles.subheading}>View and manage customer checkouts.</p>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Checkouts</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Abandoned</div>
            <div className={styles.statValue} style={{ color: "var(--color-critical)" }}>
              {stats.abandoned}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Completed</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.completed}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Value</div>
            <div className={styles.statValue}>₹{stats.totalValue}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Checkouts ({filteredCheckouts.length})</h2>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={loadCheckouts}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by email, name, or token..."
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
            <option value="abandoned">Abandoned</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {filteredCheckouts.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <p>No checkouts found. Checkouts will appear here when received from Shopify.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheckouts.map((checkout) => {
                  const status = getStatusBadge(checkout);
                  return (
                    <tr key={checkout.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatDate(checkout.created_at_shopify)}
                      </td>
                      <td>
                        {checkout.shipping_address?.first_name || checkout.billing_address?.first_name || "-"}{" "}
                        {checkout.shipping_address?.last_name || checkout.billing_address?.last_name || ""}
                      </td>
                      <td style={{ fontSize: "0.75rem" }}>{checkout.email || "-"}</td>
                      <td style={{ textAlign: "center" }}>{checkout.line_items_count || 0}</td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(checkout.total_price, checkout.currency)}
                      </td>
                      <td>
                        <span className={`${styles.itemStatus} ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={() => setSelectedCheckout(checkout)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          >
                            View
                          </button>
                          {!checkout.completed_at && checkout.abandoned_checkout_url && (
                            <a
                              href={checkout.abandoned_checkout_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${styles.btn} ${styles.btnPrimary}`}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", textDecoration: "none" }}
                            >
                              Recover
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Checkout Detail Modal */}
      {selectedCheckout && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCheckout(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Checkout Details</h2>
              <button
                className={styles.modalClose}
                onClick={() => setSelectedCheckout(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Status & Date */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <span className={`${styles.itemStatus} ${getStatusBadge(selectedCheckout).className}`}>
                  {getStatusBadge(selectedCheckout).label}
                </span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                  {formatDate(selectedCheckout.created_at_shopify)}
                </span>
                {selectedCheckout.shopify_token && (
                  <code style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                    {selectedCheckout.shopify_token.slice(0, 12)}...
                  </code>
                )}
              </div>

              <div style={{ display: "grid", gap: "1.5rem" }}>
                {/* Customer Info */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Customer Information
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
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Email</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCheckout.email || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Phone</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCheckout.phone || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Accepts Marketing</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCheckout.buyer_accepts_marketing ? "Yes" : "No"}</div>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  {/* Shipping Address */}
                  <div>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Shipping Address
                    </h3>
                    <div style={{
                      padding: "1rem",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.875rem",
                      lineHeight: 1.6
                    }}>
                      {selectedCheckout.shipping_address ? (
                        <>
                          <div>{selectedCheckout.shipping_address.first_name} {selectedCheckout.shipping_address.last_name}</div>
                          {selectedCheckout.shipping_address.company && <div>{selectedCheckout.shipping_address.company}</div>}
                          <div>{selectedCheckout.shipping_address.address1}</div>
                          {selectedCheckout.shipping_address.address2 && <div>{selectedCheckout.shipping_address.address2}</div>}
                          <div>
                            {selectedCheckout.shipping_address.city}, {selectedCheckout.shipping_address.province_code} {selectedCheckout.shipping_address.zip}
                          </div>
                          <div>{selectedCheckout.shipping_address.country}</div>
                          {selectedCheckout.shipping_address.phone && <div>{selectedCheckout.shipping_address.phone}</div>}
                        </>
                      ) : (
                        <span style={{ color: "var(--color-text-secondary)" }}>No shipping address</span>
                      )}
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Billing Address
                    </h3>
                    <div style={{
                      padding: "1rem",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.875rem",
                      lineHeight: 1.6
                    }}>
                      {selectedCheckout.billing_address ? (
                        <>
                          <div>{selectedCheckout.billing_address.first_name} {selectedCheckout.billing_address.last_name}</div>
                          {selectedCheckout.billing_address.company && <div>{selectedCheckout.billing_address.company}</div>}
                          <div>{selectedCheckout.billing_address.address1}</div>
                          {selectedCheckout.billing_address.address2 && <div>{selectedCheckout.billing_address.address2}</div>}
                          <div>
                            {selectedCheckout.billing_address.city}, {selectedCheckout.billing_address.province_code} {selectedCheckout.billing_address.zip}
                          </div>
                          <div>{selectedCheckout.billing_address.country}</div>
                        </>
                      ) : (
                        <span style={{ color: "var(--color-text-secondary)" }}>No billing address</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Line Items ({selectedCheckout.line_items_count || 0})
                  </h3>
                  <div style={{
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    {selectedCheckout.line_items && selectedCheckout.line_items.length > 0 ? (
                      <table style={{ width: "100%", fontSize: "0.875rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <th style={{ textAlign: "left", padding: "0.5rem 0", fontWeight: 500 }}>Product</th>
                            <th style={{ textAlign: "center", padding: "0.5rem 0", fontWeight: 500 }}>Qty</th>
                            <th style={{ textAlign: "right", padding: "0.5rem 0", fontWeight: 500 }}>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCheckout.line_items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                              <td style={{ padding: "0.75rem 0" }}>
                                <div>{item.title}</div>
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
                              </td>
                              <td style={{ textAlign: "center", padding: "0.75rem 0" }}>{item.quantity}</td>
                              <td style={{ textAlign: "right", padding: "0.75rem 0" }}>
                                {formatCurrency(item.price, selectedCheckout.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <span style={{ color: "var(--color-text-secondary)" }}>No line items</span>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Order Summary
                  </h3>
                  <div style={{
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedCheckout.subtotal_price, selectedCheckout.currency)}</span>
                    </div>
                    {selectedCheckout.total_discounts && parseFloat(selectedCheckout.total_discounts) > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--color-accent)" }}>
                        <span>Discounts</span>
                        <span>-{formatCurrency(selectedCheckout.total_discounts, selectedCheckout.currency)}</span>
                      </div>
                    )}
                    {selectedCheckout.shipping_line && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                        <span>Shipping ({selectedCheckout.shipping_line.title})</span>
                        <span>{formatCurrency(selectedCheckout.shipping_line.price, selectedCheckout.currency)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                      <span>Tax</span>
                      <span>{formatCurrency(selectedCheckout.total_tax, selectedCheckout.currency)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)", fontWeight: 600 }}>
                      <span>Total</span>
                      <span>{formatCurrency(selectedCheckout.total_price, selectedCheckout.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Source Info */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Source Information
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
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Source</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCheckout.source_name || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Landing Site</div>
                      <div style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{selectedCheckout.landing_site || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Referring Site</div>
                      <div style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{selectedCheckout.referring_site || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Recovery Link */}
                {!selectedCheckout.completed_at && selectedCheckout.abandoned_checkout_url && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Recovery
                    </h3>
                    <div style={{
                      padding: "1rem",
                      background: "rgba(255, 68, 68, 0.1)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-critical)"
                    }}>
                      <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                        This checkout was abandoned. You can send the customer a recovery link.
                      </p>
                      <a
                        href={selectedCheckout.abandoned_checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={{ textDecoration: "none" }}
                      >
                        Open Recovery Link
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setSelectedCheckout(null)}
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

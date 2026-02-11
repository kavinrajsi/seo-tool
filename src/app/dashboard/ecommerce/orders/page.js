"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "../page.module.css";

export default function OrdersPage() {
  const { activeProject } = useProject();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Tracking modal state
  const [trackingModal, setTrackingModal] = useState(null); // order object or null
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [trackingCompany, setTrackingCompany] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [activeProject]);

  async function loadOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("projectId", activeProject);
      const query = params.toString();
      const res = await fetch(`/api/ecommerce/orders${query ? `?${query}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      setError("Failed to load orders");
    }
    setLoading(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatPrice(price, currency = "INR") {
    if (!price) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(price));
  }

  function getFinancialStatusColor(status) {
    switch (status) {
      case "paid":
        return styles.statusActive;
      case "pending":
      case "authorized":
        return styles.statusDraft;
      case "refunded":
      case "voided":
        return styles.statusArchived;
      default:
        return styles.statusDraft;
    }
  }

  function getFulfillmentStatusColor(status) {
    switch (status) {
      case "fulfilled":
        return styles.statusActive;
      case "partial":
        return styles.statusDraft;
      case "unfulfilled":
      default:
        return styles.statusArchived;
    }
  }

  function getTracking(order) {
    const fulfillments = order.fulfillments || [];
    for (const f of fulfillments) {
      if (f.tracking_number) {
        return {
          number: f.tracking_number,
          url: f.tracking_url || null,
          company: f.tracking_company || null,
        };
      }
    }
    return null;
  }

  function openTrackingModal(order) {
    const existing = getTracking(order);
    setTrackingModal(order);
    setTrackingNumber(existing?.number || "");
    setTrackingUrl(existing?.url || "");
    setTrackingCompany(existing?.company || "");
    setNotifyCustomer(true);
    setError("");
    setSuccess("");
  }

  function closeTrackingModal() {
    setTrackingModal(null);
    setTrackingNumber("");
    setTrackingUrl("");
    setTrackingCompany("");
    setNotifyCustomer(true);
  }

  async function handleSubmitTracking(e) {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/ecommerce/orders/${trackingModal.id}/fulfillment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_number: trackingNumber.trim(),
          tracking_url: trackingUrl.trim() || undefined,
          tracking_company: trackingCompany.trim() || undefined,
          notify_customer: notifyCustomer,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sync tracking with Shopify");
        setSubmitting(false);
        return;
      }

      // Update the order in local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === trackingModal.id
            ? { ...o, fulfillments: data.fulfillments, status: "fulfilled" }
            : o
        )
      );

      setSuccess(`Tracking added for ${trackingModal.order_number} and synced with Shopify`);
      closeTrackingModal();
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase());

    let matchesStatus = statusFilter === "all";
    if (!matchesStatus) {
      matchesStatus = o.status === statusFilter || o.financial_status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const paidOrders = orders.filter(o => o.financial_status === "paid");
  const unfulfilledOrders = orders.filter(o => o.status === "unfulfilled");
  const shippedOrders = orders.filter(o => getTracking(o) !== null);
  const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("100px", "28px", "0.5rem")} />
        <div style={b("300px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4,5].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("140px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Order","Customer","Date","Fulfillment","Payment","Tracking","Total",""].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => <td key={j}><div style={b(j===2?"70%":"50%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Orders</h1>
      <p className={styles.subheading}>View Shopify orders synced via webhooks.</p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{orders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Paid</div>
          <div className={styles.statValue}>{paidOrders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Unfulfilled</div>
          <div className={styles.statValue}>{unfulfilledOrders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Shipped</div>
          <div className={styles.statValue}>{shippedOrders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Revenue</div>
          <div className={`${styles.statValue} ${styles.accent}`}>
            {formatPrice(totalRevenue)}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Orders</h2>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by order #, email, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <optgroup label="Fulfillment">
              <option value="unfulfilled">Unfulfilled</option>
              <option value="partial">Partial</option>
              <option value="fulfilled">Fulfilled</option>
            </optgroup>
            <optgroup label="Financial">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </optgroup>
          </select>
        </div>

        {filteredOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>No orders found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Fulfillment</th>
                  <th>Payment</th>
                  <th>Tracking</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const tracking = getTracking(order);
                  return (
                    <tr key={order.id}>
                      <td>{order.order_number}</td>
                      <td>
                        <div>{order.customer_name || "-"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#888" }}>
                          {order.customer_email || "-"}
                        </div>
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>
                        <span
                          className={`${styles.itemStatus} ${getFulfillmentStatusColor(order.status)}`}
                        >
                          {order.status || "unfulfilled"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.itemStatus} ${getFinancialStatusColor(order.financial_status)}`}
                        >
                          {order.financial_status || "pending"}
                        </span>
                      </td>
                      <td>
                        {tracking ? (
                          <div>
                            {tracking.url ? (
                              <a
                                href={tracking.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "var(--color-accent)", textDecoration: "none", fontSize: "0.8rem" }}
                              >
                                {tracking.number}
                              </a>
                            ) : (
                              <span style={{ fontSize: "0.8rem" }}>{tracking.number}</span>
                            )}
                            {tracking.company && (
                              <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "2px" }}>
                                {tracking.company}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#888" }}>-</span>
                        )}
                      </td>
                      <td>{formatPrice(order.total_price, order.currency || "INR")}</td>
                      <td>
                        <button
                          className={`${styles.btn} ${tracking ? styles.btnSecondary : styles.btnPrimary}`}
                          onClick={() => openTrackingModal(order)}
                          style={{ whiteSpace: "nowrap", fontSize: "0.75rem", padding: "0.35rem 0.65rem" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="3" width="15" height="13" rx="2" />
                            <polyline points="16 8 20 8 23 11 23 16 20 16" />
                            <circle cx="5.5" cy="18.5" r="2.5" />
                            <circle cx="18.5" cy="18.5" r="2.5" />
                          </svg>
                          {tracking ? "Edit" : "Add Tracking"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tracking Modal */}
      {trackingModal && (
        <div className={styles.modalOverlay} onClick={closeTrackingModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {getTracking(trackingModal) ? "Edit" : "Add"} Shipping Tracking
              </h3>
              <button className={styles.modalClose} onClick={closeTrackingModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitTracking}>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>Order</div>
                  <div style={{ fontWeight: 600 }}>
                    {trackingModal.order_number} — {trackingModal.customer_name || trackingModal.customer_email}
                  </div>
                </div>

                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Tracking Number *</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. 1Z999AA10123456784"
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Tracking URL</label>
                    <input
                      className={styles.input}
                      type="url"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="e.g. https://www.delhivery.com/track/..."
                    />
                    <span className={styles.hint}>Full tracking page URL for this shipment</span>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Shipping Carrier</label>
                    <select
                      className={styles.select}
                      value={trackingCompany}
                      onChange={(e) => setTrackingCompany(e.target.value)}
                    >
                      <option value="">Select carrier...</option>
                      <option value="Delhivery">Delhivery</option>
                      <option value="Blue Dart">Blue Dart</option>
                      <option value="DTDC">DTDC</option>
                      <option value="Ekart">Ekart</option>
                      <option value="Shadowfax">Shadowfax</option>
                      <option value="Ecom Express">Ecom Express</option>
                      <option value="Xpressbees">Xpressbees</option>
                      <option value="India Post">India Post</option>
                      <option value="FedEx">FedEx</option>
                      <option value="DHL">DHL</option>
                      <option value="UPS">UPS</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      id="notifyCustomer"
                      checked={notifyCustomer}
                      onChange={(e) => setNotifyCustomer(e.target.checked)}
                      style={{ accentColor: "var(--color-accent)" }}
                    />
                    <label htmlFor="notifyCustomer" style={{ fontSize: "0.85rem", color: "var(--color-text)", cursor: "pointer" }}>
                      Notify customer via Shopify email
                    </label>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={closeTrackingModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={submitting || !trackingNumber.trim()}
                >
                  {submitting ? "Syncing with Shopify..." : "Save & Sync to Shopify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

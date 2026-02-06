"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function TrackingPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingData, setTrackingData] = useState({
    carrier: "",
    tracking_number: "",
    tracking_url: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/ecommerce/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      setError("Failed to load orders");
    }
    setLoading(false);
  }

  function openTrackingModal(order) {
    setSelectedOrder(order);
    setTrackingData({
      carrier: order.tracking_carrier || "",
      tracking_number: order.tracking_number || "",
      tracking_url: order.tracking_url || "",
    });
    setShowModal(true);
  }

  async function handleSaveTracking(e) {
    e.preventDefault();
    if (!selectedOrder) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/ecommerce/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_carrier: trackingData.carrier,
          tracking_number: trackingData.tracking_number,
          tracking_url: trackingData.tracking_url,
          status: "shipped",
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setSelectedOrder(null);
        loadOrders();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update tracking");
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const filteredOrders = orders.filter((o) =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.tracking_number?.toLowerCase().includes(search.toLowerCase())
  );

  const shippedOrders = filteredOrders.filter((o) => o.tracking_number);
  const pendingOrders = filteredOrders.filter((o) => !o.tracking_number && o.status !== "cancelled");

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Order Tracking</h1>
      <p className={styles.subheading}>Manage shipment tracking for orders.</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{orders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>With Tracking</div>
          <div className={`${styles.statValue} ${styles.accent}`}>
            {orders.filter((o) => o.tracking_number).length}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Needs Tracking</div>
          <div className={styles.statValue}>
            {orders.filter((o) => !o.tracking_number && o.status !== "cancelled").length}
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by order # or tracking #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Pending Tracking */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Needs Tracking ({pendingOrders.length})</h2>
        </div>

        {pendingOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>All orders have tracking information.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.order_number}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <span className={`${styles.itemStatus} ${styles.statusDraft}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                        onClick={() => openTrackingModal(order)}
                      >
                        Add Tracking
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shipped Orders */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Shipped Orders ({shippedOrders.length})</h2>
        </div>

        {shippedOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No shipped orders yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Carrier</th>
                  <th>Tracking #</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shippedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.order_number}</td>
                    <td>{order.tracking_carrier || "-"}</td>
                    <td>
                      {order.tracking_url ? (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {order.tracking_number}
                        </a>
                      ) : (
                        order.tracking_number
                      )}
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                        onClick={() => openTrackingModal(order)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {selectedOrder?.tracking_number ? "Edit" : "Add"} Tracking - #{selectedOrder?.order_number}
              </h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveTracking}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Carrier</label>
                    <select
                      className={styles.select}
                      value={trackingData.carrier}
                      onChange={(e) => setTrackingData({ ...trackingData, carrier: e.target.value })}
                    >
                      <option value="">Select carrier...</option>
                      <option value="UPS">UPS</option>
                      <option value="FedEx">FedEx</option>
                      <option value="USPS">USPS</option>
                      <option value="DHL">DHL</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tracking Number *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={trackingData.tracking_number}
                      onChange={(e) => setTrackingData({ ...trackingData, tracking_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tracking URL</label>
                    <input
                      type="url"
                      className={styles.input}
                      placeholder="https://..."
                      value={trackingData.tracking_url}
                      onChange={(e) => setTrackingData({ ...trackingData, tracking_url: e.target.value })}
                    />
                    <span className={styles.hint}>Optional: Direct link to tracking page</span>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Tracking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

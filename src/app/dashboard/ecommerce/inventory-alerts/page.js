"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import useNotificationSound from "@/app/hooks/useNotificationSound";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "../page.module.css";

function StatusBadge({ status }) {
  const map = {
    active: styles.statusActive,
    triggered: styles.statusTriggered,
    paused: styles.statusArchived,
  };
  const cls = map[status] || styles.statusDraft;
  return <span className={cls}>{status}</span>;
}

export default function InventoryAlertsPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const { playSound } = useNotificationSound();
  const prevTriggeredRef = useRef(0);

  const [form, setForm] = useState({
    product_id: "",
    product_title: "",
    product_image: "",
    threshold: 5,
  });

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await projectFetch(`/api/ecommerce/inventory-alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setStats(data.stats);
        setLogs(data.logs || []);

        // Play notification sound if triggered count increased
        const newTriggered = (data.stats?.triggered || 0);
        if (newTriggered > prevTriggeredRef.current && prevTriggeredRef.current > 0) {
          playSound();
        }
        prevTriggeredRef.current = newTriggered;
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load alerts");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, [projectFetch, playSound]);

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const res = await projectFetch("/api/ecommerce/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      // Non-critical
    }
    setProductsLoading(false);
  }

  useEffect(() => {
    loadAlerts(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetching on mount
  }, [loadAlerts]);

  function openAddModal() {
    setEditingAlert(null);
    setForm({ product_id: "", product_title: "", product_image: "", threshold: 5 });
    setShowModal(true);
    if (products.length === 0) loadProducts();
  }

  function openEditModal(alert) {
    setEditingAlert(alert);
    setForm({
      product_id: alert.product_id,
      product_title: alert.product_title,
      product_image: alert.product_image || "",
      threshold: alert.threshold,
    });
    setShowModal(true);
  }

  function handleProductSelect(e) {
    const id = e.target.value;
    const product = products.find((p) => p.shopify_id === id);
    if (product) {
      setForm({
        ...form,
        product_id: product.shopify_id,
        product_title: product.title,
        product_image: product.image?.src || product.images?.[0]?.src || "",
      });
    } else {
      setForm({ ...form, product_id: id, product_title: "", product_image: "" });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.product_id || form.threshold === "" || form.threshold === null) return;
    setSubmitting(true);
    setError("");

    try {
      if (editingAlert) {
        const res = await fetch(`/api/ecommerce/inventory-alerts/${editingAlert.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threshold: Number(form.threshold) }),
        });
        if (res.ok) {
          setShowModal(false);
          loadAlerts();
        } else {
          const data = await res.json();
          setError(data.error || "Failed to update alert");
        }
      } else {
        const res = await fetch("/api/ecommerce/inventory-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: form.product_id,
            product_title: form.product_title,
            product_image: form.product_image || null,
            threshold: Number(form.threshold),
            project_id: activeProjectId || null,
          }),
        });
        if (res.ok) {
          setShowModal(false);
          loadAlerts();
        } else {
          const data = await res.json();
          setError(data.error || "Failed to create alert");
        }
      }
    } catch {
      setError("Network error");
    }
    setSubmitting(false);
  }

  async function handleStatusChange(alertId, newStatus) {
    try {
      const res = await fetch(`/api/ecommerce/inventory-alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadAlerts();
      }
    } catch {
      setError("Network error");
    }
  }

  async function handleDelete(alertId) {
    try {
      const res = await fetch(`/api/ecommerce/inventory-alerts/${alertId}`, { method: "DELETE" });
      if (res.ok) {
        loadAlerts();
      }
    } catch {
      setError("Network error");
    }
  }

  const filtered = alerts.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch = (a.product_title || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatDateTime(d) {
    if (!d) return "-";
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("200px", "28px", "0.5rem")} />
        <div style={b("340px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Product", "Stock", "Threshold", "Status", "Last Triggered", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1, 2, 3, 4, 5].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6].map((j) => <td key={j}><div style={b(j === 1 ? "100px" : "60%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Inventory Alerts</h1>
      <p className={styles.subheading}>
        Set stock thresholds per product and get notified when inventory runs low.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Alerts</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.active}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Triggered</div>
            <div className={styles.statValue} style={{ color: stats.triggered > 0 ? "var(--color-critical)" : undefined }}>
              {stats.triggered}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Paused</div>
            <div className={styles.statValue}>{stats.paused}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Alerts ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadAlerts}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAddModal}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Alert
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search products..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="triggered">Triggered</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p>No inventory alerts yet. Add alerts to monitor stock levels for your products.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Last Triggered</th>
                  <th style={{ width: "140px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((alert) => (
                  <tr
                    key={alert.id}
                    className={alert.status === "triggered" ? styles.flaggedRow : undefined}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {alert.product_image ? (
                          <Image
                            src={alert.product_image}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            style={{ borderRadius: "6px", objectFit: "cover", background: "var(--color-bg)" }}
                          />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: "6px", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            </svg>
                          </div>
                        )}
                        <span style={{ fontWeight: 500 }}>{alert.product_title}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: alert.current_stock <= alert.threshold ? "var(--color-critical)" : "var(--color-text)" }}>
                        {alert.current_stock}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        &le; {alert.threshold}
                      </span>
                    </td>
                    <td><StatusBadge status={alert.status} /></td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {formatDate(alert.last_triggered_at)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => openEditModal(alert)}
                          title="Edit threshold"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {alert.status === "active" || alert.status === "triggered" ? (
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => handleStatusChange(alert.id, "paused")}
                            title="Pause"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => handleStatusChange(alert.id, "active")}
                            title="Resume"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-pass)" strokeWidth="2">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </button>
                        )}
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => handleDelete(alert.id)}
                          title="Delete"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert History */}
      {logs.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Alert History</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Previous Stock</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Triggered At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 500 }}>{log.product_title || "-"}</td>
                    <td>{log.previous_stock !== null ? log.previous_stock : "-"}</td>
                    <td style={{ color: "var(--color-critical)", fontWeight: 600 }}>{log.current_stock}</td>
                    <td style={{ color: "var(--color-text-secondary)" }}>&le; {log.threshold}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {formatDateTime(log.triggered_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Alert Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingAlert ? "Edit Alert" : "Add Inventory Alert"}</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  {!editingAlert && (
                    <div className={styles.field}>
                      <label className={styles.label}>Product *</label>
                      <select
                        className={styles.input}
                        value={form.product_id}
                        onChange={handleProductSelect}
                        required
                        disabled={productsLoading}
                      >
                        <option value="">{productsLoading ? "Loading products..." : "Select a product"}</option>
                        {products.map((p) => (
                          <option key={p.shopify_id} value={p.shopify_id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {editingAlert && (
                    <div className={styles.field}>
                      <label className={styles.label}>Product</label>
                      <input
                        className={styles.input}
                        value={form.product_title}
                        disabled
                      />
                    </div>
                  )}
                  <div className={styles.field}>
                    <label className={styles.label}>Stock Threshold *</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: e.target.value === "" ? "" : parseInt(e.target.value, 10) })}
                      required
                    />
                    <span className={styles.hint}>Alert triggers when stock falls to or below this number</span>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={submitting || (!editingAlert && !form.product_id) || form.threshold === "" || form.threshold === null}
                >
                  {submitting ? "Saving..." : editingAlert ? "Update Alert" : "Create Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

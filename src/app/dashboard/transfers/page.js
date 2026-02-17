"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./page.module.css";

const STATUS_LABELS = {
  requested: "Requested",
  store_approved: "Store Approved",
  warehouse_approved: "WH Approved",
  packing: "Packing",
  packed: "Packed",
  dispatched: "Dispatched",
  in_transit: "In Transit",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_STYLES = {
  requested: "statusRequested",
  store_approved: "statusStoreApproved",
  warehouse_approved: "statusWarehouseApproved",
  packing: "statusPacking",
  packed: "statusPacked",
  dispatched: "statusDispatched",
  in_transit: "statusInTransit",
  delivered: "statusDelivered",
  rejected: "statusRejected",
  cancelled: "statusCancelled",
};

const PRIORITY_STYLES = {
  low: "priorityLow",
  normal: "priorityNormal",
  high: "priorityHigh",
  urgent: "priorityUrgent",
};

const STATUS_LOG_COLORS = {
  requested: "#3b82f6",
  store_approved: "#f59e0b",
  warehouse_approved: "#a855f7",
  packing: "#ec4899",
  packed: "#22c55e",
  dispatched: "#14b8a6",
  in_transit: "#6366f1",
  delivered: "var(--color-pass)",
  rejected: "#ff4444",
  cancelled: "#9ca3af",
};

const TASK_STATUS_STYLES = {
  pending: "taskPending",
  in_progress: "taskInProgress",
  completed: "taskCompleted",
};

const TABS = [
  { key: "all", label: "All Transfers" },
  { key: "my_requests", label: "My Requests" },
  { key: "approvals", label: "Approvals" },
  { key: "packing", label: "Packing" },
  { key: "logistics", label: "Logistics" },
];

const EMPTY_ITEM = { product_id: "", product_name: "", product_code: "", quantity_requested: 1, unit: "pcs", item_notes: "" };

function StatusBadge({ status }) {
  return <span className={styles[STATUS_STYLES[status]] || styles.statusRequested}>{STATUS_LABELS[status] || status}</span>;
}

function PriorityBadge({ priority }) {
  return <span className={styles[PRIORITY_STYLES[priority]] || styles.priorityNormal}>{priority}</span>;
}

export default function TransfersPage() {
  const { activeProject } = useProject();
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState(null);
  const [locations, setLocations] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    source_location_id: "",
    destination_location_id: "",
    priority: "normal",
    request_notes: "",
    expected_delivery_date: "",
    items: [{ ...EMPTY_ITEM }],
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Detail drawer
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [drawerTab, setDrawerTab] = useState("details");
  const [transferDetail, setTransferDetail] = useState(null);
  const [statusLog, setStatusLog] = useState([]);
  const [packingTasks, setPackingTasks] = useState([]);
  const [deliveryAssignments, setDeliveryAssignments] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Approve/Reject modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveAction, setApproveAction] = useState("approve");
  const [approveNotes, setApproveNotes] = useState("");
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  // Packing assign modal
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packingForm, setPackingForm] = useState({ assigned_to: "", packing_notes: "" });
  const [packingSubmitting, setPackingSubmitting] = useState(false);

  // Delivery assign modal
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ assigned_to: "", vehicle_number: "", driver_name: "", driver_phone: "", delivery_notes: "" });
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);

  async function loadTransfers() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      if (activeProject) params.set("project_id", activeProject.id);
      const res = await fetch(`/api/transfers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.transfers || []);
        setStats(data.stats || null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load transfers");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function loadLocations() {
    try {
      const res = await fetch("/api/transfers/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations((data.locations || []).filter((l) => l.is_active));
      }
    } catch {
      // silently fail
    }
  }

  async function loadCatalogProducts() {
    try {
      const res = await fetch("/api/transfers/products");
      if (res.ok) {
        const data = await res.json();
        setCatalogProducts((data.products || []).filter((p) => p.is_active));
      }
    } catch {
      // silently fail
    }
  }

  async function loadProfiles() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.users || []);
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    loadLocations();
    loadCatalogProducts();
    loadProfiles();
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [activeTab, statusFilter, activeProject]);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatDateTime(d) {
    if (!d) return "-";
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  // Load transfer detail
  const loadDetail = useCallback(async (transfer) => {
    setSelectedTransfer(transfer);
    setDrawerTab("details");
    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/transfers/${transfer.id}`);
      if (res.ok) {
        const data = await res.json();
        setTransferDetail(data.transfer);
        setStatusLog(data.statusLog || []);
        setPackingTasks(data.packingTasks || []);
        setDeliveryAssignments(data.deliveryAssignments || []);
      }
    } catch {
      // silently fail
    }
    setLoadingDetail(false);
  }, []);

  // Create transfer
  function openCreateModal() {
    setCreateForm({
      source_location_id: "",
      destination_location_id: "",
      priority: "normal",
      request_notes: "",
      expected_delivery_date: "",
      items: [{ ...EMPTY_ITEM }],
    });
    setCreateError("");
    setShowCreateModal(true);
  }

  function updateItem(index, field, value) {
    setCreateForm((p) => {
      const items = [...p.items];
      if (field === "product_id") {
        if (value === "__custom__") {
          items[index] = { ...items[index], product_id: "__custom__", product_name: "", product_code: "", unit: "pcs" };
        } else if (value) {
          const cp = catalogProducts.find((cp) => cp.id === value);
          if (cp) {
            items[index] = { ...items[index], product_id: value, product_name: cp.product_name, product_code: cp.product_code || "", unit: cp.unit || "pcs" };
          }
        } else {
          items[index] = { ...items[index], product_id: "", product_name: "", product_code: "", unit: "pcs" };
        }
      } else {
        items[index] = { ...items[index], [field]: value };
      }
      return { ...p, items };
    });
  }

  function addItem() {
    setCreateForm((p) => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(index) {
    setCreateForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");
    setCreateSubmitting(true);

    const payload = { ...createForm, project_id: activeProject?.id || null };

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Transfer ${data.transfer.transfer_number} created`);
        setShowCreateModal(false);
        loadTransfers();
      } else {
        setCreateError(data.error || "Failed to create transfer");
      }
    } catch {
      setCreateError("Network error");
    }
    setCreateSubmitting(false);
  }

  // Approve / Reject
  function openApproveModal(action) {
    setApproveAction(action);
    setApproveNotes("");
    setShowApproveModal(true);
  }

  async function handleApprove(e) {
    e.preventDefault();
    if (!selectedTransfer) return;
    setApproveSubmitting(true);

    try {
      const res = await fetch(`/api/transfers/${selectedTransfer.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: approveAction,
          rejection_reason: approveAction === "reject" ? approveNotes : undefined,
          notes: approveAction === "approve" ? approveNotes : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(approveAction === "approve" ? "Transfer approved" : "Transfer rejected");
        setShowApproveModal(false);
        loadTransfers();
        loadDetail(selectedTransfer);
      } else {
        setError(data.error || "Action failed");
      }
    } catch {
      setError("Network error");
    }
    setApproveSubmitting(false);
  }

  // Status transition
  async function handleStatusChange(newStatus, notes) {
    if (!selectedTransfer) return;
    try {
      const res = await fetch(`/api/transfers/${selectedTransfer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: newStatus, notes }),
      });
      if (res.ok) {
        showSuccess(`Status changed to ${STATUS_LABELS[newStatus]}`);
        loadTransfers();
        loadDetail(selectedTransfer);
      } else {
        const data = await res.json();
        setError(data.error || "Status change failed");
      }
    } catch {
      setError("Network error");
    }
  }

  // Packing
  async function handleAssignPacking(e) {
    e.preventDefault();
    if (!selectedTransfer) return;
    setPackingSubmitting(true);

    try {
      const res = await fetch(`/api/transfers/${selectedTransfer.id}/packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packingForm),
      });
      if (res.ok) {
        showSuccess("Packing task assigned");
        setShowPackingModal(false);
        loadDetail(selectedTransfer);
        loadTransfers();
      }
    } catch {
      // silently fail
    }
    setPackingSubmitting(false);
  }

  async function handleUpdatePackingTask(taskId, taskStatus) {
    if (!selectedTransfer) return;
    try {
      await fetch(`/api/transfers/${selectedTransfer.id}/packing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, task_status: taskStatus }),
      });
      loadDetail(selectedTransfer);
      loadTransfers();
    } catch {
      // silently fail
    }
  }

  // Delivery
  async function handleAssignDelivery(e) {
    e.preventDefault();
    if (!selectedTransfer) return;
    setDeliverySubmitting(true);

    try {
      const res = await fetch(`/api/transfers/${selectedTransfer.id}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryForm),
      });
      if (res.ok) {
        showSuccess("Delivery assigned");
        setShowDeliveryModal(false);
        loadDetail(selectedTransfer);
      }
    } catch {
      // silently fail
    }
    setDeliverySubmitting(false);
  }

  async function handleUpdateDelivery(assignmentId, deliveryStatus) {
    if (!selectedTransfer) return;
    try {
      await fetch(`/api/transfers/${selectedTransfer.id}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId, delivery_status: deliveryStatus }),
      });
      loadDetail(selectedTransfer);
      loadTransfers();
    } catch {
      // silently fail
    }
  }

  // Cancel
  async function handleCancel() {
    if (!selectedTransfer || !confirm("Cancel this transfer?")) return;
    await handleStatusChange("cancelled", "Cancelled by requester");
  }

  // Filtered list
  const filtered = transfers.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.transfer_number?.toLowerCase().includes(q) ||
      t.source?.location_name?.toLowerCase().includes(q) ||
      t.destination?.location_name?.toLowerCase().includes(q) ||
      t.request_notes?.toLowerCase().includes(q)
    );
  });

  // Loading skeleton
  if (loading && transfers.length === 0) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("200px", "28px", "0.5rem")} />
        <div style={b("360px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.tabs}>{TABS.map((t) => <div key={t.key} style={b("100px", "32px")} />)}</div>
          <table className={styles.table}>
            <thead><tr>{["#", "Route", "Items", "Priority", "Status", "Date"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{[1, 2, 3, 4].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6].map((j) => <td key={j}><div style={b("70%", "14px")} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.sectionHeader} style={{ padding: 0, background: "none", border: "none", marginBottom: "0.5rem" }}>
        <div>
          <h1 className={styles.heading}>Product Transfers</h1>
          <p className={styles.subheading} style={{ margin: 0 }}>Manage inter-store and warehouse product transfers.</p>
        </div>
        <div className={styles.sectionActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreateModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Transfer
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && <div className={styles.success} onClick={() => setSuccessMsg("")} style={{ cursor: "pointer" }}>{successMsg}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Requested</div>
            <div className={styles.statValue} style={{ color: "#3b82f6" }}>{stats.requested}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>In Progress</div>
            <div className={styles.statValue} style={{ color: "#a855f7" }}>{stats.in_progress}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Delivered</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.delivered}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
              onClick={() => { setActiveTab(t.key); setStatusFilter("all"); }}
            >
              {t.label}
              {t.key === "all" && stats && <span className={styles.tabBadge}>{stats.total}</span>}
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by transfer #, location, notes..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {activeTab === "all" && (
            <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadTransfers}>Refresh</button>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polyline points="16 8 20 8 23 11 23 16 19 16 19 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <p>No transfers found. Create a new transfer to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Transfer #</th>
                  <th>Route</th>
                  <th>Items</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className={styles.clickableRow} onClick={() => loadDetail(t)}>
                    <td style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--color-accent)" }}>{t.transfer_number}</td>
                    <td>
                      <div className={styles.transferRoute}>
                        <div className={styles.locationLabel}>
                          <span className={styles.locationName}>{t.source?.location_name || "?"}</span>
                          <span className={styles.locationCode}>{t.source?.location_code}</span>
                        </div>
                        <span className={styles.routeArrow}>→</span>
                        <div className={styles.locationLabel}>
                          <span className={styles.locationName}>{t.destination?.location_name || "?"}</span>
                          <span className={styles.locationCode}>{t.destination?.location_code}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className={styles.itemsCount}>{t.items?.length || 0}</span></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={t.transfer_status} /></td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{formatDate(t.requested_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className={`${styles.modal} ${styles.modalWide}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>New Transfer Request</h3>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className={styles.modalBody}>
                {createError && <div className={styles.error}>{createError}</div>}
                <div className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Source Location *</label>
                      <select className={styles.select} value={createForm.source_location_id} onChange={(e) => setCreateForm((p) => ({ ...p, source_location_id: e.target.value }))} required>
                        <option value="">Select source</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>{l.location_name} ({l.location_code}) — {l.location_type}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Destination Location *</label>
                      <select className={styles.select} value={createForm.destination_location_id} onChange={(e) => setCreateForm((p) => ({ ...p, destination_location_id: e.target.value }))} required>
                        <option value="">Select destination</option>
                        {locations.filter((l) => l.id !== createForm.source_location_id).map((l) => (
                          <option key={l.id} value={l.id}>{l.location_name} ({l.location_code}) — {l.location_type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Priority</label>
                      <select className={styles.select} value={createForm.priority} onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}>
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Expected Delivery</label>
                      <input className={styles.input} type="date" value={createForm.expected_delivery_date} onChange={(e) => setCreateForm((p) => ({ ...p, expected_delivery_date: e.target.value }))} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Items *</label>
                    {createForm.items.map((item, i) => (
                      <div key={i} className={styles.itemRow}>
                        {catalogProducts.length > 0 ? (
                          <>
                            <select className={styles.select} value={item.product_id} onChange={(e) => updateItem(i, "product_id", e.target.value)} required={!item.product_name} style={{ minWidth: "180px" }}>
                              <option value="">Select product</option>
                              {catalogProducts.map((cp) => (
                                <option key={cp.id} value={cp.id}>{cp.product_name}{cp.product_code ? ` (${cp.product_code})` : ""}</option>
                              ))}
                              <option value="__custom__">-- Custom entry --</option>
                            </select>
                            {item.product_id === "__custom__" && (
                              <input className={styles.input} type="text" placeholder="Product name *" value={item.product_name} onChange={(e) => updateItem(i, "product_name", e.target.value)} required />
                            )}
                          </>
                        ) : (
                          <input className={styles.input} type="text" placeholder="Product name *" value={item.product_name} onChange={(e) => updateItem(i, "product_name", e.target.value)} required />
                        )}
                        <input className={styles.input} type="text" placeholder="SKU" value={item.product_code} onChange={(e) => updateItem(i, "product_code", e.target.value)} style={{ maxWidth: "120px" }} />
                        <input className={styles.input} type="number" min="1" placeholder="Qty" value={item.quantity_requested} onChange={(e) => updateItem(i, "quantity_requested", parseInt(e.target.value) || 1)} required />
                        <select className={styles.select} value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)}>
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="box">box</option>
                        </select>
                        {createForm.items.length > 1 && (
                          <button type="button" className={styles.removeItemBtn} onClick={() => removeItem(i)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className={styles.addItemBtn} onClick={addItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Item
                    </button>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <textarea className={styles.textarea} rows={2} value={createForm.request_notes} onChange={(e) => setCreateForm((p) => ({ ...p, request_notes: e.target.value }))} placeholder="Any notes for this transfer..." />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={createSubmitting}>
                  {createSubmitting ? "Creating..." : "Create Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedTransfer && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setSelectedTransfer(null)} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>
                {selectedTransfer.transfer_number}
                <span style={{ marginLeft: "0.75rem" }}><StatusBadge status={selectedTransfer.transfer_status} /></span>
              </h3>
              <button className={styles.modalClose} onClick={() => setSelectedTransfer(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.tabs}>
              {["details", "items", "log", "packing", "delivery"].map((t) => (
                <button key={t} className={`${styles.tab} ${drawerTab === t ? styles.tabActive : ""}`} onClick={() => setDrawerTab(t)}>
                  {t === "details" ? "Details" : t === "items" ? `Items (${transferDetail?.items?.length || selectedTransfer.items?.length || 0})` : t === "log" ? `Log (${statusLog.length})` : t === "packing" ? `Packing (${packingTasks.length})` : `Delivery (${deliveryAssignments.length})`}
                </button>
              ))}
            </div>

            <div className={styles.drawerBody}>
              {loadingDetail ? (
                <p style={{ color: "var(--color-text-secondary)" }}>Loading...</p>
              ) : drawerTab === "details" ? (
                <>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Source</span>
                      <span className={styles.detailValue}>{selectedTransfer.source?.location_name} ({selectedTransfer.source?.location_code})</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Destination</span>
                      <span className={styles.detailValue}>{selectedTransfer.destination?.location_name} ({selectedTransfer.destination?.location_code})</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Priority</span>
                      <span className={styles.detailValue}><PriorityBadge priority={selectedTransfer.priority} /></span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Status</span>
                      <span className={styles.detailValue}><StatusBadge status={selectedTransfer.transfer_status} /></span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Requested</span>
                      <span className={styles.detailValue}>{formatDateTime(selectedTransfer.requested_at)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Expected Delivery</span>
                      <span className={styles.detailValue}>{formatDate(selectedTransfer.expected_delivery_date)}</span>
                    </div>
                    {selectedTransfer.dispatched_at && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Dispatched</span>
                        <span className={styles.detailValue}>{formatDateTime(selectedTransfer.dispatched_at)}</span>
                      </div>
                    )}
                    {selectedTransfer.delivered_at && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Delivered</span>
                        <span className={styles.detailValue} style={{ color: "var(--color-pass)" }}>{formatDateTime(selectedTransfer.delivered_at)}</span>
                      </div>
                    )}
                  </div>
                  {selectedTransfer.request_notes && (
                    <div className={styles.detailItem} style={{ marginBottom: "1rem" }}>
                      <span className={styles.detailLabel}>Notes</span>
                      <span className={styles.detailValue}>{selectedTransfer.request_notes}</span>
                    </div>
                  )}
                  {selectedTransfer.rejection_reason && (
                    <div className={styles.detailItem} style={{ marginBottom: "1rem" }}>
                      <span className={styles.detailLabel}>Rejection Reason</span>
                      <span className={styles.detailValue} style={{ color: "#ff4444" }}>{selectedTransfer.rejection_reason}</span>
                    </div>
                  )}

                  <div className={styles.drawerActions}>
                    {["requested", "store_approved"].includes(selectedTransfer.transfer_status) && (
                      <>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openApproveModal("approve")}>Approve</button>
                        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => openApproveModal("reject")}>Reject</button>
                      </>
                    )}
                    {selectedTransfer.transfer_status === "requested" && (
                      <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCancel}>Cancel</button>
                    )}
                    {selectedTransfer.transfer_status === "warehouse_approved" && (
                      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setPackingForm({ assigned_to: "", packing_notes: "" }); setShowPackingModal(true); }}>Assign Packing</button>
                    )}
                    {selectedTransfer.transfer_status === "packed" && (
                      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setDeliveryForm({ assigned_to: "", vehicle_number: "", driver_name: "", driver_phone: "", delivery_notes: "" }); setShowDeliveryModal(true); }}>Assign Delivery</button>
                    )}
                    {selectedTransfer.transfer_status === "packed" && (
                      <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => handleStatusChange("dispatched", "Dispatched")}>Mark Dispatched</button>
                    )}
                    {selectedTransfer.transfer_status === "dispatched" && (
                      <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => handleStatusChange("in_transit", "In transit")}>Mark In Transit</button>
                    )}
                    {selectedTransfer.transfer_status === "in_transit" && (
                      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleStatusChange("delivered", "Delivered")}>Mark Delivered</button>
                    )}
                  </div>
                </>
              ) : drawerTab === "items" ? (
                <>
                  <div className={styles.subsectionHeader}>
                    <span className={styles.subsectionTitle}>Transfer Items</span>
                  </div>
                  {(transferDetail?.items || selectedTransfer.items || []).length === 0 ? (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>No items.</p>
                  ) : (
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Requested</th>
                          <th>Packed</th>
                          <th>Delivered</th>
                          <th>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(transferDetail?.items || selectedTransfer.items || []).map((item) => (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                            <td style={{ color: "var(--color-text-secondary)" }}>{item.product_code || "-"}</td>
                            <td>{item.quantity_requested}</td>
                            <td>{item.quantity_packed}</td>
                            <td>{item.quantity_delivered}</td>
                            <td>{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              ) : drawerTab === "log" ? (
                <>
                  <div className={styles.subsectionHeader}>
                    <span className={styles.subsectionTitle}>Status Log</span>
                  </div>
                  {statusLog.length === 0 ? (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>No log entries.</p>
                  ) : (
                    <div className={styles.timeline}>
                      {statusLog.map((log) => (
                        <div key={log.id} className={styles.timelineItem}>
                          <div className={styles.timelineRow}>
                            <span className={styles.timelineName}>
                              <span className={styles.logDot} style={{ background: STATUS_LOG_COLORS[log.to_status] || "#9ca3af" }} />
                              {log.from_status ? `${STATUS_LABELS[log.from_status] || log.from_status} → ` : ""}{STATUS_LABELS[log.to_status] || log.to_status}
                            </span>
                          </div>
                          <div className={styles.timelineDate}>
                            {formatDateTime(log.changed_at)}
                            {log.changer && <span> by {log.changer.full_name || log.changer.email}</span>}
                          </div>
                          {log.notes && <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{log.notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : drawerTab === "packing" ? (
                <>
                  <div className={styles.subsectionHeader}>
                    <span className={styles.subsectionTitle}>Packing Tasks</span>
                    {["warehouse_approved", "packing"].includes(selectedTransfer.transfer_status) && (
                      <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => { setPackingForm({ assigned_to: "", packing_notes: "" }); setShowPackingModal(true); }}>
                        Assign Task
                      </button>
                    )}
                  </div>
                  {packingTasks.length === 0 ? (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>No packing tasks assigned yet.</p>
                  ) : (
                    packingTasks.map((task) => (
                      <div key={task.id} className={styles.taskCard}>
                        <div className={styles.taskHeader}>
                          <span className={styles.taskTitle}>{task.assignee?.full_name || task.assignee?.email || "Unassigned"}</span>
                          <span className={styles[TASK_STATUS_STYLES[task.task_status]] || styles.taskPending}>
                            {task.task_status === "in_progress" ? "In Progress" : task.task_status}
                          </span>
                        </div>
                        <div className={styles.taskMeta}>
                          Assigned: {formatDateTime(task.assigned_at)}
                          {task.started_at && <> | Started: {formatDateTime(task.started_at)}</>}
                          {task.completed_at && <> | Done: {formatDateTime(task.completed_at)}</>}
                        </div>
                        {task.packing_notes && <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.375rem" }}>{task.packing_notes}</div>}
                        {task.task_status !== "completed" && (
                          <div className={styles.taskActions}>
                            {task.task_status === "pending" && (
                              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => handleUpdatePackingTask(task.id, "in_progress")}>Start</button>
                            )}
                            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => handleUpdatePackingTask(task.id, "completed")}>Complete</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              ) : drawerTab === "delivery" ? (
                <>
                  <div className={styles.subsectionHeader}>
                    <span className={styles.subsectionTitle}>Delivery Assignments</span>
                    {["packed", "dispatched"].includes(selectedTransfer.transfer_status) && (
                      <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => { setDeliveryForm({ assigned_to: "", vehicle_number: "", driver_name: "", driver_phone: "", delivery_notes: "" }); setShowDeliveryModal(true); }}>
                        Assign Delivery
                      </button>
                    )}
                  </div>
                  {deliveryAssignments.length === 0 ? (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>No delivery assignments yet.</p>
                  ) : (
                    deliveryAssignments.map((da) => (
                      <div key={da.id} className={styles.taskCard}>
                        <div className={styles.taskHeader}>
                          <span className={styles.taskTitle}>{da.assignee?.full_name || da.assignee?.email || "Unassigned"}</span>
                          <span className={styles[TASK_STATUS_STYLES[da.delivery_status === "delivered" ? "completed" : da.delivery_status === "pending" ? "pending" : "in_progress"]] || styles.taskPending}>
                            {da.delivery_status}
                          </span>
                        </div>
                        <div className={styles.taskMeta}>
                          {da.driver_name && <>Driver: {da.driver_name}</>}
                          {da.vehicle_number && <> | Vehicle: {da.vehicle_number}</>}
                          {da.driver_phone && <> | Ph: {da.driver_phone}</>}
                        </div>
                        <div className={styles.taskMeta}>
                          Assigned: {formatDateTime(da.assigned_at)}
                          {da.picked_up_at && <> | Picked up: {formatDateTime(da.picked_up_at)}</>}
                          {da.delivered_at && <> | Delivered: {formatDateTime(da.delivered_at)}</>}
                        </div>
                        {da.delivery_notes && <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.375rem" }}>{da.delivery_notes}</div>}
                        {da.recipient_name && <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>Received by: {da.recipient_name}</div>}
                        {!["delivered", "failed"].includes(da.delivery_status) && (
                          <div className={styles.taskActions}>
                            {da.delivery_status === "pending" && (
                              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => handleUpdateDelivery(da.id, "picked_up")}>Picked Up</button>
                            )}
                            {["pending", "picked_up"].includes(da.delivery_status) && (
                              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => handleUpdateDelivery(da.id, "in_transit")}>In Transit</button>
                            )}
                            {["picked_up", "in_transit"].includes(da.delivery_status) && (
                              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => handleUpdateDelivery(da.id, "delivered")}>Delivered</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* Approve/Reject Modal */}
      {showApproveModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowApproveModal(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{approveAction === "approve" ? "Approve Transfer" : "Reject Transfer"}</h3>
              <button className={styles.modalClose} onClick={() => setShowApproveModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleApprove}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1rem" }}>
                    {approveAction === "approve"
                      ? `Approve transfer ${selectedTransfer?.transfer_number}?`
                      : `Reject transfer ${selectedTransfer?.transfer_number}?`}
                  </p>
                  <div className={styles.field}>
                    <label className={styles.label}>{approveAction === "reject" ? "Rejection Reason" : "Notes"}</label>
                    <textarea className={styles.textarea} rows={3} value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder={approveAction === "reject" ? "Reason for rejection..." : "Optional notes..."} required={approveAction === "reject"} />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowApproveModal(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${approveAction === "approve" ? styles.btnPrimary : styles.btnDanger}`} disabled={approveSubmitting}>
                  {approveSubmitting ? "Processing..." : approveAction === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Packing Assign Modal */}
      {showPackingModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowPackingModal(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Assign Packing Task</h3>
              <button className={styles.modalClose} onClick={() => setShowPackingModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAssignPacking}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Assign To *</label>
                    <select className={styles.select} value={packingForm.assigned_to} onChange={(e) => setPackingForm((p) => ({ ...p, assigned_to: e.target.value }))} required>
                      <option value="">Select person</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <textarea className={styles.textarea} rows={2} value={packingForm.packing_notes} onChange={(e) => setPackingForm((p) => ({ ...p, packing_notes: e.target.value }))} placeholder="Packing instructions..." />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowPackingModal(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={packingSubmitting}>
                  {packingSubmitting ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Assign Modal */}
      {showDeliveryModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowDeliveryModal(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Assign Delivery</h3>
              <button className={styles.modalClose} onClick={() => setShowDeliveryModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAssignDelivery}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Assign To *</label>
                    <select className={styles.select} value={deliveryForm.assigned_to} onChange={(e) => setDeliveryForm((p) => ({ ...p, assigned_to: e.target.value }))} required>
                      <option value="">Select person</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Driver Name</label>
                      <input className={styles.input} type="text" value={deliveryForm.driver_name} onChange={(e) => setDeliveryForm((p) => ({ ...p, driver_name: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Driver Phone</label>
                      <input className={styles.input} type="tel" value={deliveryForm.driver_phone} onChange={(e) => setDeliveryForm((p) => ({ ...p, driver_phone: e.target.value }))} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Vehicle Number</label>
                    <input className={styles.input} type="text" value={deliveryForm.vehicle_number} onChange={(e) => setDeliveryForm((p) => ({ ...p, vehicle_number: e.target.value }))} placeholder="e.g. TN 01 AB 1234" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <textarea className={styles.textarea} rows={2} value={deliveryForm.delivery_notes} onChange={(e) => setDeliveryForm((p) => ({ ...p, delivery_notes: e.target.value }))} placeholder="Delivery instructions..." />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowDeliveryModal(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={deliverySubmitting}>
                  {deliverySubmitting ? "Assigning..." : "Assign Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./page.module.css";

const DEVICE_TYPES = ["laptop", "mobile", "tablet", "monitor", "keyboard", "mouse", "headset", "other"];
const DEVICE_STATUS_OPTIONS = ["available", "assigned", "repair", "retired"];

const STATUS_LABELS = {
  available: "Available",
  assigned: "Assigned",
  repair: "In Repair",
  retired: "Retired",
};

const STATUS_STYLES = {
  available: "statusAvailable",
  assigned: "statusAssigned",
  repair: "statusRepair",
  retired: "statusRetired",
};

const ISSUE_STATUS_LABELS = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };
const ISSUE_STATUS_STYLES = { open: "issueOpen", in_progress: "issueInProgress", resolved: "issueResolved" };

const TYPE_ICONS = {
  laptop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  mobile: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  tablet: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  monitor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  keyboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="10" x2="6.01" y2="10" />
      <line x1="10" y1="10" x2="10.01" y2="10" />
      <line x1="14" y1="10" x2="14.01" y2="10" />
      <line x1="18" y1="10" x2="18.01" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  ),
  mouse: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="2" width="12" height="20" rx="6" />
      <line x1="12" y1="6" x2="12" y2="10" />
    </svg>
  ),
  headset: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  ),
  other: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
    </svg>
  ),
};

const EMPTY_DEVICE_FORM = {
  device_type: "laptop",
  brand: "",
  model: "",
  serial_number: "",
  asset_tag: "",
  purchase_date: "",
  warranty_expiry: "",
  device_status: "available",
  notes: "",
};

function StatusBadge({ status }) {
  return <span className={styles[STATUS_STYLES[status]] || styles.statusAvailable}>{STATUS_LABELS[status] || status}</span>;
}

function IssueStatusBadge({ status }) {
  return <span className={styles[ISSUE_STATUS_STYLES[status]] || styles.issueOpen}>{ISSUE_STATUS_LABELS[status] || status}</span>;
}

export default function DevicesPage() {
  const { activeProject } = useProject();
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState("brand");
  const [sortDirection, setSortDirection] = useState("asc");

  // Add/Edit device modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_DEVICE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Detail drawer
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [drawerTab, setDrawerTab] = useState("details");
  const [assignments, setAssignments] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignDeviceId, setAssignDeviceId] = useState(null);
  const [assignForm, setAssignForm] = useState({ employee_id: "", assigned_date: "", notes: "" });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: "", description: "", reported_by: "" });
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  async function loadDevices() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("projectId", activeProject);
      const query = params.toString();
      const res = await fetch(`/api/devices${query ? `?${query}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load devices");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function loadEmployees() {
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("projectId", activeProject);
      const query = params.toString();
      const res = await fetch(`/api/employees${query ? `?${query}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    loadDevices();
    loadEmployees();
  }, [activeProject]);

  const loadDeviceDetail = useCallback(async (device) => {
    setSelectedDevice(device);
    setDrawerTab("details");
    setLoadingDetail(true);

    try {
      const [assignRes, issueRes] = await Promise.all([
        fetch(`/api/devices/${device.id}/assignments`),
        fetch(`/api/devices/${device.id}/issues`),
      ]);
      if (assignRes.ok) {
        const ad = await assignRes.json();
        setAssignments(ad.assignments || []);
      }
      if (issueRes.ok) {
        const id = await issueRes.json();
        setIssues(id.issues || []);
      }
    } catch {
      // silently fail
    }
    setLoadingDetail(false);
  }, []);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  // Device CRUD
  function openAddModal() {
    setForm(EMPTY_DEVICE_FORM);
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(device) {
    setForm({
      device_type: device.device_type || "laptop",
      brand: device.brand || "",
      model: device.model || "",
      serial_number: device.serial_number || "",
      asset_tag: device.asset_tag || "",
      purchase_date: device.purchase_date || "",
      warranty_expiry: device.warranty_expiry || "",
      device_status: device.device_status || "available",
      notes: device.notes || "",
    });
    setEditingId(device.id);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const payload = { ...form };
    if (activeProject && activeProject !== "all") {
      payload.projectId = activeProject;
    }

    try {
      const url = editingId ? `/api/devices/${editingId}` : "/api/devices";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(editingId ? "Device updated successfully" : "Device added successfully");
        closeModal();
        loadDevices();
        if (selectedDevice && editingId === selectedDevice.id) {
          loadDeviceDetail({ ...selectedDevice, ...data.device });
        }
      } else {
        setFormError(data.error || "Failed to save device");
      }
    } catch {
      setFormError("Network error");
    }
    setSubmitting(false);
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Device deleted");
        loadDevices();
        if (selectedDevice && selectedDevice.id === id) setSelectedDevice(null);
      }
    } catch {
      setError("Network error");
    }
  }

  // Assign
  function openAssignModal(deviceId) {
    setAssignDeviceId(deviceId || (selectedDevice ? selectedDevice.id : null));
    setAssignForm({ employee_id: "", assigned_date: new Date().toISOString().split("T")[0], notes: "" });
    setShowAssignModal(true);
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignForm.employee_id || !assignDeviceId) return;
    setAssignSubmitting(true);

    try {
      const res = await fetch(`/api/devices/${assignDeviceId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignForm),
      });
      if (res.ok) {
        showSuccess("Device assigned successfully");
        setShowAssignModal(false);
        setAssignDeviceId(null);
        loadDevices();
        if (selectedDevice && selectedDevice.id === assignDeviceId) {
          loadDeviceDetail(selectedDevice);
        }
      }
    } catch {
      // silently fail
    }
    setAssignSubmitting(false);
  }

  // Unassign (return device)
  async function handleUnassign() {
    try {
      // Close current assignment
      const openAssignment = assignments.find((a) => !a.returned_date);
      if (openAssignment) {
        const today = new Date().toISOString().split("T")[0];
        // We'll update the device directly
        await fetch(`/api/devices/${selectedDevice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_status: "available", assigned_to: null }),
        });
        showSuccess("Device returned successfully");
        loadDevices();
        loadDeviceDetail(selectedDevice);
      }
    } catch {
      // silently fail
    }
  }

  // Issues
  function openIssueModal() {
    setIssueForm({ title: "", description: "", reported_by: "" });
    setShowIssueModal(true);
  }

  async function handleCreateIssue(e) {
    e.preventDefault();
    if (!issueForm.title) return;
    setIssueSubmitting(true);

    try {
      const res = await fetch(`/api/devices/${selectedDevice.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueForm),
      });
      if (res.ok) {
        showSuccess("Issue created");
        setShowIssueModal(false);
        loadDeviceDetail(selectedDevice);
      }
    } catch {
      // silently fail
    }
    setIssueSubmitting(false);
  }

  async function handleUpdateIssueStatus(issueId, newStatus, resolutionNotes) {
    try {
      const body = { issue_status: newStatus };
      if (resolutionNotes) body.resolution_notes = resolutionNotes;
      await fetch(`/api/devices/${selectedDevice.id}/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      loadDeviceDetail(selectedDevice);
    } catch {
      // silently fail
    }
  }

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Filter & sort
  const filtered = devices.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch =
      d.brand.toLowerCase().includes(q) ||
      d.model.toLowerCase().includes(q) ||
      (d.serial_number || "").toLowerCase().includes(q) ||
      (d.asset_tag || "").toLowerCase().includes(q) ||
      (d.assigned_employee ? `${d.assigned_employee.first_name} ${d.assigned_employee.last_name}`.toLowerCase().includes(q) : false);
    const matchesStatus = statusFilter === "all" || d.device_status === statusFilter;
    const matchesType = typeFilter === "all" || d.device_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function getSortValue(device, column) {
    switch (column) {
      case "type": return device.device_type;
      case "brand": return `${device.brand} ${device.model}`.toLowerCase();
      case "serial": return (device.serial_number || "").toLowerCase();
      case "status": return device.device_status;
      case "assigned": return device.assigned_employee ? `${device.assigned_employee.first_name} ${device.assigned_employee.last_name}`.toLowerCase() : "zzz";
      case "warranty": return device.warranty_expiry || "9999";
      default: return "";
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    const aVal = getSortValue(a, sortColumn);
    const bVal = getSortValue(b, sortColumn);
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  function SortHeader({ column, children, style }) {
    const isActive = sortColumn === column;
    return (
      <th className={styles.sortableTh} style={style} onClick={() => handleSort(column)}>
        <span className={styles.sortableLabel}>
          {children}
          <svg className={`${styles.sortIcon} ${isActive ? styles.sortIconActive : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            {isActive && sortDirection === "desc" ? <path d="M3 5l3 3 3-3" /> : <path d="M3 7l3-3 3 3" />}
          </svg>
        </span>
      </th>
    );
  }

  // Loading skeleton
  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("180px", "28px", "0.5rem")} />
        <div style={b("340px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Type", "Device", "Serial", "Status", "Assigned To", "Warranty", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1, 2, 3, 4, 5].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6, 7].map((j) => <td key={j}><div style={b("60%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.sectionHeader} style={{ padding: 0, background: "none", border: "none", marginBottom: "0.5rem" }}>
        <div>
          <h1 className={styles.heading}>Device Management</h1>
          <p className={styles.subheading} style={{ margin: 0 }}>Track company devices, assignments, and issues.</p>
        </div>
        <div className={styles.sectionActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Device
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && <div className={styles.success} onClick={() => setSuccessMsg("")} style={{ cursor: "pointer" }}>{successMsg}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Devices</div>
            <div className={styles.statValue}>{stats.totalDevices}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Available</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.availableCount}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Assigned</div>
            <div className={styles.statValue} style={{ color: "#3b82f6" }}>{stats.assignedCount}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>In Repair</div>
            <div className={styles.statValue} style={{ color: stats.repairCount > 0 ? "var(--color-warning)" : undefined }}>{stats.repairCount}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Retired</div>
            <div className={styles.statValue}>{stats.retiredCount}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Devices ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadDevices}>
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
            placeholder="Search by brand, model, serial, assignee..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {DEVICE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="2" y1="20" x2="22" y2="20" />
            </svg>
            <p>No devices found. Click &quot;Add Device&quot; to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <SortHeader column="type">Type</SortHeader>
                  <SortHeader column="brand">Device</SortHeader>
                  <SortHeader column="serial">Serial / Asset</SortHeader>
                  <SortHeader column="status">Status</SortHeader>
                  <SortHeader column="assigned">Assigned To</SortHeader>
                  <SortHeader column="warranty">Warranty</SortHeader>
                  <th style={{ width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((device) => (
                  <tr key={device.id} className={styles.clickableRow} onClick={() => loadDeviceDetail(device)}>
                    <td>
                      <span className={styles.typeBadge}>
                        {TYPE_ICONS[device.device_type] || TYPE_ICONS.other}
                        {device.device_type.charAt(0).toUpperCase() + device.device_type.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{device.brand} {device.model}</div>
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>
                      {device.serial_number || "-"}
                      {device.asset_tag && <div style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>{device.asset_tag}</div>}
                    </td>
                    <td><StatusBadge status={device.device_status} /></td>
                    <td style={{ fontSize: "0.8rem" }}>
                      {device.assigned_employee
                        ? `${device.assigned_employee.first_name} ${device.assigned_employee.last_name}`
                        : "-"}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{formatDate(device.warranty_expiry)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }} onClick={(e) => e.stopPropagation()}>
                        {device.device_status !== "assigned" && device.device_status !== "retired" && (
                          <button
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                            onClick={() => openAssignModal(device.id)}
                            title="Assign to Employee"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                          </button>
                        )}
                        <button
                          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                          onClick={() => openEditModal(device)}
                          title="Edit"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                          onClick={() => handleDelete(device.id)}
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

      {/* Add/Edit Device Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingId ? "Edit Device" : "Add Device"}</h3>
              <button className={styles.modalClose} onClick={closeModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {formError && <div className={styles.error}>{formError}</div>}
                <div className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Device Type *</label>
                      <select className={styles.select} value={form.device_type} onChange={(e) => setForm((p) => ({ ...p, device_type: e.target.value }))} required>
                        {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Status</label>
                      <select className={styles.select} value={form.device_status} onChange={(e) => setForm((p) => ({ ...p, device_status: e.target.value }))}>
                        {DEVICE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Brand *</label>
                      <input className={styles.input} type="text" value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} placeholder="e.g. Apple, Dell, Samsung" required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Model *</label>
                      <input className={styles.input} type="text" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="e.g. MacBook Pro 14&quot;" required />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Serial Number</label>
                      <input className={styles.input} type="text" value={form.serial_number} onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Asset Tag</label>
                      <input className={styles.input} type="text" value={form.asset_tag} onChange={(e) => setForm((p) => ({ ...p, asset_tag: e.target.value }))} placeholder="e.g. IT-LAP-001" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Purchase Date</label>
                      <input className={styles.input} type="date" value={form.purchase_date} onChange={(e) => setForm((p) => ({ ...p, purchase_date: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Warranty Expiry</label>
                      <input className={styles.input} type="date" value={form.warranty_expiry} onChange={(e) => setForm((p) => ({ ...p, warranty_expiry: e.target.value }))} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <textarea className={styles.textarea} rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update Device" : "Add Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedDevice && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setSelectedDevice(null)} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>
                <span className={styles.typeBadge}>
                  {TYPE_ICONS[selectedDevice.device_type] || TYPE_ICONS.other}
                  {selectedDevice.brand} {selectedDevice.model}
                </span>
              </h3>
              <button className={styles.modalClose} onClick={() => setSelectedDevice(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.tabs}>
              <button className={`${styles.tab} ${drawerTab === "details" ? styles.tabActive : ""}`} onClick={() => setDrawerTab("details")}>Details</button>
              <button className={`${styles.tab} ${drawerTab === "history" ? styles.tabActive : ""}`} onClick={() => setDrawerTab("history")}>History ({assignments.length})</button>
              <button className={`${styles.tab} ${drawerTab === "issues" ? styles.tabActive : ""}`} onClick={() => setDrawerTab("issues")}>Issues ({issues.length})</button>
            </div>

            <div className={styles.drawerBody}>
              {loadingDetail ? (
                <p style={{ color: "var(--color-text-secondary)" }}>Loading...</p>
              ) : drawerTab === "details" ? (
                <>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Type</span>
                      <span className={styles.detailValue}>{selectedDevice.device_type.charAt(0).toUpperCase() + selectedDevice.device_type.slice(1)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Status</span>
                      <span className={styles.detailValue}><StatusBadge status={selectedDevice.device_status} /></span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Serial Number</span>
                      <span className={styles.detailValue}>{selectedDevice.serial_number || "-"}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Asset Tag</span>
                      <span className={styles.detailValue}>{selectedDevice.asset_tag || "-"}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Purchase Date</span>
                      <span className={styles.detailValue}>{formatDate(selectedDevice.purchase_date)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Warranty Expiry</span>
                      <span className={styles.detailValue}>{formatDate(selectedDevice.warranty_expiry)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Assigned To</span>
                      <span className={styles.detailValue}>
                        {selectedDevice.assigned_employee
                          ? `${selectedDevice.assigned_employee.first_name} ${selectedDevice.assigned_employee.last_name}`
                          : "Unassigned"}
                      </span>
                    </div>
                  </div>
                  {selectedDevice.notes && (
                    <div className={styles.detailItem} style={{ marginBottom: "1.25rem" }}>
                      <span className={styles.detailLabel}>Notes</span>
                      <span className={styles.detailValue}>{selectedDevice.notes}</span>
                    </div>
                  )}
                  <hr className={styles.divider} />
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {selectedDevice.device_status !== "assigned" && (
                      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openAssignModal(selectedDevice.id)}>Assign to Employee</button>
                    )}
                    {selectedDevice.device_status === "assigned" && (
                      <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleUnassign}>Return Device</button>
                    )}
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openEditModal(selectedDevice)}>Edit Device</button>
                  </div>
                </>
              ) : drawerTab === "history" ? (
                <>
                  <div className={styles.subsectionHeader}>
                    <span className={styles.subsectionTitle}>Assignment History</span>
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => openAssignModal(selectedDevice.id)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Assign
                    </button>
                  </div>
                  {assignments.length === 0 ? (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>No assignment history yet.</p>
                  ) : (
                    <div className={styles.timeline}>
                      {assignments.map((a) => (
                        <div key={a.id} className={`${styles.timelineItem} ${!a.returned_date ? styles.timelineActive : ""}`}>
                          <div className={styles.timelineRow}>
                            <span className={styles.timelineName}>
                              {a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : "Unknown"}
                              {a.employee?.employee_number && <span style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}> #{a.employee.employee_number}</span>}
                            </span>
                            {!a.returned_date && <span className={styles.statusAssigned}>Current</span>}
                          </div>
                          <div className={styles.timelineDate}>
                            {formatDate(a.assigned_date)} {a.returned_date ? `- ${formatDate(a.returned_date)}` : "- Present"}
                          </div>
                          {a.notes && <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{a.notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : drawerTab === "issues" ? (
                <>
                  <div className={styles.subsectionHeader}>
                    <span className={styles.subsectionTitle}>Issues</span>
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={openIssueModal}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Report Issue
                    </button>
                  </div>
                  {issues.length === 0 ? (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>No issues reported for this device.</p>
                  ) : (
                    issues.map((issue) => (
                      <div key={issue.id} className={styles.issueCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                          <h4 className={styles.issueTitle}>{issue.title}</h4>
                          <IssueStatusBadge status={issue.issue_status} />
                        </div>
                        {issue.description && <p className={styles.issueDesc}>{issue.description}</p>}
                        <div className={styles.issueMeta}>
                          {issue.reporter && <span className={styles.issueMetaItem}>Reported by: {issue.reporter.first_name} {issue.reporter.last_name}</span>}
                          <span className={styles.issueMetaItem}>Created: {formatDate(issue.created_at)}</span>
                          {issue.resolved_at && <span className={styles.issueMetaItem}>Resolved: {formatDate(issue.resolved_at)}</span>}
                        </div>
                        {issue.resolution_notes && (
                          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--color-pass)", padding: "0.5rem", background: "rgba(143,255,0,0.05)", borderRadius: "var(--radius-md)" }}>
                            Resolution: {issue.resolution_notes}
                          </div>
                        )}
                        {issue.issue_status !== "resolved" && (
                          <div className={styles.issueActions}>
                            {issue.issue_status === "open" && (
                              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => handleUpdateIssueStatus(issue.id, "in_progress")}>
                                Mark In Progress
                              </button>
                            )}
                            <button
                              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                              onClick={() => {
                                const notes = prompt("Resolution notes (optional):");
                                handleUpdateIssueStatus(issue.id, "resolved", notes || "");
                              }}
                            >
                              Resolve
                            </button>
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

      {/* Assign Modal */}
      {showAssignModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowAssignModal(false); setAssignDeviceId(null); } }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Assign Device</h3>
              <button className={styles.modalClose} onClick={() => { setShowAssignModal(false); setAssignDeviceId(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAssign}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Employee *</label>
                    <select className={styles.select} value={assignForm.employee_id} onChange={(e) => setAssignForm((p) => ({ ...p, employee_id: e.target.value }))} required>
                      <option value="">Select employee</option>
                      {employees.filter((e) => e.employee_status === "active").map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} {emp.employee_number ? `(#${emp.employee_number})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Assigned Date</label>
                    <input className={styles.input} type="date" value={assignForm.assigned_date} onChange={(e) => setAssignForm((p) => ({ ...p, assigned_date: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <textarea className={styles.textarea} rows={2} value={assignForm.notes} onChange={(e) => setAssignForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setShowAssignModal(false); setAssignDeviceId(null); }}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={assignSubmitting}>
                  {assignSubmitting ? "Assigning..." : "Assign Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowIssueModal(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Report Issue</h3>
              <button className={styles.modalClose} onClick={() => setShowIssueModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateIssue}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Issue Title *</label>
                    <input className={styles.input} type="text" value={issueForm.title} onChange={(e) => setIssueForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Screen flickering, Battery not charging" required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Description</label>
                    <textarea className={styles.textarea} rows={3} value={issueForm.description} onChange={(e) => setIssueForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe the issue in detail..." />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Reported By</label>
                    <select className={styles.select} value={issueForm.reported_by} onChange={(e) => setIssueForm((p) => ({ ...p, reported_by: e.target.value }))}>
                      <option value="">Select employee (optional)</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={issueSubmitting}>
                  {issueSubmitting ? "Creating..." : "Create Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

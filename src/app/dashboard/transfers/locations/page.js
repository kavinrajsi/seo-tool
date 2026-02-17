"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./page.module.css";

const EMPTY_FORM = {
  location_name: "",
  location_type: "store",
  location_code: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  phone_number: "",
  email: "",
  manager_id: "",
  notes: "",
};

export default function TransferLocationsPage() {
  const { activeProject } = useProject();
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadLocations() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("project_id", activeProject.id);
      const res = await fetch(`/api/transfers/locations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
        setStats(data.stats || null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load locations");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function loadEmployees() {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    loadLocations();
    loadEmployees();
  }, [activeProject]);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  function openAddModal() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(loc) {
    setForm({
      location_name: loc.location_name || "",
      location_type: loc.location_type || "store",
      location_code: loc.location_code || "",
      address_line_1: loc.address_line_1 || "",
      address_line_2: loc.address_line_2 || "",
      city: loc.city || "",
      state: loc.state || "",
      postal_code: loc.postal_code || "",
      phone_number: loc.phone_number || "",
      email: loc.email || "",
      manager_id: loc.manager_id || "",
      notes: loc.notes || "",
    });
    setEditingId(loc.id);
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

    const payload = { ...form, project_id: activeProject?.id || null };

    try {
      const url = editingId ? `/api/transfers/locations/${editingId}` : "/api/transfers/locations";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(editingId ? "Location updated" : "Location added");
        closeModal();
        loadLocations();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    }
    setSubmitting(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this location?")) return;
    try {
      const res = await fetch(`/api/transfers/locations/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Location deleted");
        loadLocations();
      }
    } catch {
      setError("Network error");
    }
  }

  async function handleToggleActive(loc) {
    try {
      await fetch(`/api/transfers/locations/${loc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !loc.is_active }),
      });
      loadLocations();
    } catch {
      // silently fail
    }
  }

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      l.location_name.toLowerCase().includes(q) ||
      l.location_code.toLowerCase().includes(q) ||
      (l.city || "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || l.location_type === typeFilter;
    return matchSearch && matchType;
  });

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("220px", "28px", "0.5rem")} />
        <div style={b("380px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /></div>
          <table className={styles.table}>
            <thead><tr>{["Name", "Code", "Type", "City", "Manager", "Status", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{[1, 2, 3].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6, 7].map((j) => <td key={j}><div style={b("60%", "14px")} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.sectionHeader} style={{ padding: 0, background: "none", border: "none", marginBottom: "0.5rem" }}>
        <div>
          <h1 className={styles.heading}>Transfer Locations</h1>
          <p className={styles.subheading} style={{ margin: 0 }}>Manage stores and warehouses for product transfers.</p>
        </div>
        <div className={styles.sectionActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Location
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && <div className={styles.success} onClick={() => setSuccessMsg("")} style={{ cursor: "pointer" }}>{successMsg}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Locations</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Stores</div>
            <div className={styles.statValue} style={{ color: "#3b82f6" }}>{stats.stores}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Warehouses</div>
            <div className={styles.statValue} style={{ color: "#a855f7" }}>{stats.warehouses}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.active}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Locations ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadLocations}>Refresh</button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by name, code, city..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="store">Stores</option>
            <option value="warehouse">Warehouses</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p>No locations found. Add a store or warehouse to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loc) => (
                  <tr key={loc.id}>
                    <td style={{ fontWeight: 500 }}>{loc.location_name}</td>
                    <td><code style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{loc.location_code}</code></td>
                    <td>
                      <span className={loc.location_type === "store" ? styles.typeStore : styles.typeWarehouse}>
                        {loc.location_type}
                      </span>
                    </td>
                    <td>{loc.city || "-"}</td>
                    <td style={{ fontSize: "0.8rem" }}>
                      {loc.manager ? `${loc.manager.first_name} ${loc.manager.last_name}` : "-"}
                    </td>
                    <td>
                      <span
                        className={loc.is_active ? styles.statusActive : styles.statusInactive}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleToggleActive(loc)}
                        title="Click to toggle"
                      >
                        {loc.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openEditModal(loc)} title="Edit">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleDelete(loc.id)} title="Delete">
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingId ? "Edit Location" : "Add Location"}</h3>
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
                      <label className={styles.label}>Location Name *</label>
                      <input className={styles.input} type="text" value={form.location_name} onChange={(e) => setForm((p) => ({ ...p, location_name: e.target.value }))} placeholder="e.g. T. Nagar Store" required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Location Code *</label>
                      <input className={styles.input} type="text" value={form.location_code} onChange={(e) => setForm((p) => ({ ...p, location_code: e.target.value }))} placeholder="e.g. STR-TNR-01" required />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Type *</label>
                      <select className={styles.select} value={form.location_type} onChange={(e) => setForm((p) => ({ ...p, location_type: e.target.value }))}>
                        <option value="store">Store</option>
                        <option value="warehouse">Warehouse</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Manager</label>
                      <select className={styles.select} value={form.manager_id} onChange={(e) => setForm((p) => ({ ...p, manager_id: e.target.value }))}>
                        <option value="">No manager</option>
                        {employees.filter((e) => e.employee_status === "active").map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Address Line 1</label>
                    <input className={styles.input} type="text" value={form.address_line_1} onChange={(e) => setForm((p) => ({ ...p, address_line_1: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Address Line 2</label>
                    <input className={styles.input} type="text" value={form.address_line_2} onChange={(e) => setForm((p) => ({ ...p, address_line_2: e.target.value }))} />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>City</label>
                      <input className={styles.input} type="text" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Chennai" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>State</label>
                      <input className={styles.input} type="text" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} placeholder="Tamil Nadu" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Postal Code</label>
                      <input className={styles.input} type="text" value={form.postal_code} onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))} />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Phone</label>
                      <input className={styles.input} type="tel" value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Email</label>
                      <input className={styles.input} type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <textarea className={styles.textarea} rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update Location" : "Add Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

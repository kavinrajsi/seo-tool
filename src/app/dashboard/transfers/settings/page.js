"use client";

import { useState, useEffect } from "react";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

const ROLE_OPTIONS = [
  { value: "lineman", label: "Lineman", desc: "Creates transfer requests" },
  { value: "store_manager", label: "Store Manager", desc: "Approves outgoing transfers" },
  { value: "warehouse_manager", label: "Warehouse Manager", desc: "Approves warehouse transfers" },
  { value: "packing_team", label: "Packing Team", desc: "Packs approved transfers" },
  { value: "logistics_manager", label: "Logistics Manager", desc: "Assigns delivery tasks" },
  { value: "logistics_team", label: "Logistics Team", desc: "Handles deliveries" },
];

const ROLE_STYLES = {
  lineman: "roleLineman",
  store_manager: "roleStoreManager",
  warehouse_manager: "roleWarehouseManager",
  packing_team: "rolePackingTeam",
  logistics_manager: "roleLogisticsManager",
  logistics_team: "roleLogisticsTeam",
};

const ROLE_LABELS = {
  lineman: "Lineman",
  store_manager: "Store Manager",
  warehouse_manager: "Warehouse Manager",
  packing_team: "Packing Team",
  logistics_manager: "Logistics Manager",
  logistics_team: "Logistics Team",
};

export default function TransferSettingsPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user_id: "", employee_id: "", location_id: "", role: "lineman" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadRoles() {
    setLoading(true);
    setError("");
    try {
      const res = await projectFetch("/api/transfers/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load roles");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function loadLocations() {
    try {
      const res = await projectFetch("/api/transfers/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch {
      // silently fail
    }
  }

  async function loadProfiles() {
    try {
      const res = await projectFetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.users || []);
      }
    } catch {
      // silently fail
    }
  }

  async function loadEmployees() {
    try {
      const res = await projectFetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    loadRoles();
    loadLocations();
    loadProfiles();
    loadEmployees();
  }, []);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  function openModal() {
    setForm({ user_id: "", employee_id: "", location_id: "", role: "lineman" });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/transfers/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, project_id: activeProjectId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Role assigned");
        setShowModal(false);
        loadRoles();
      } else {
        setFormError(data.error || "Failed to assign role");
      }
    } catch {
      setFormError("Network error");
    }
    setSubmitting(false);
  }

  async function handleRemove(id) {
    if (!confirm("Remove this role assignment?")) return;
    try {
      const res = await fetch(`/api/transfers/roles/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Role removed");
        loadRoles();
      }
    } catch {
      setError("Network error");
    }
  }

  const filtered = roles.filter((r) => {
    const matchLoc = locationFilter === "all" || r.location_id === locationFilter;
    const matchRole = roleFilter === "all" || r.role === roleFilter;
    return matchLoc && matchRole;
  });

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("260px", "28px", "0.5rem")} />
        <div style={b("400px", "14px", "1.5rem")} />
        <div className={styles.section}>
          <div className={styles.toolbar}><div style={{ ...s, width: "200px", height: "38px", borderRadius: "8px" }} /></div>
          <table className={styles.table}>
            <thead><tr>{["User", "Employee", "Location", "Role", "Assigned", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{[1, 2, 3].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6].map((j) => <td key={j}><div style={b("60%", "14px")} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.sectionHeader} style={{ padding: 0, background: "none", border: "none", marginBottom: "0.5rem" }}>
        <div>
          <h1 className={styles.heading}>Transfer Role Settings</h1>
          <p className={styles.subheading} style={{ margin: 0 }}>Assign roles to users for transfer workflow permissions.</p>
        </div>
        <div className={styles.sectionActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Assign Role
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && <div className={styles.success} onClick={() => setSuccessMsg("")} style={{ cursor: "pointer" }}>{successMsg}</div>}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Role Assignments ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadRoles}>Refresh</button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <select className={styles.filterSelect} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="all">All Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.location_name} ({l.location_code})</option>
            ))}
          </select>
          <select className={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>No role assignments found. Click &quot;Assign Role&quot; to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Employee</th>
                  <th>Location</th>
                  <th>Role</th>
                  <th>Assigned</th>
                  <th style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>
                      {r.profile ? r.profile.full_name || r.profile.email : r.user_id?.slice(0, 8) + "..."}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>
                      {r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : "-"}
                    </td>
                    <td>
                      <span className={styles.locBadge}>
                        <span className={`${styles.locType} ${r.location?.location_type === "store" ? styles.locStore : styles.locWarehouse}`}>
                          {r.location?.location_type || "?"}
                        </span>
                        {r.location?.location_name || "-"}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles[ROLE_STYLES[r.role]] || ""}`}>
                        {ROLE_LABELS[r.role] || r.role}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {formatDate(r.created_at)}
                    </td>
                    <td>
                      <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleRemove(r.id)} title="Remove">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Role Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Assign Transfer Role</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
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
                  <div className={styles.field}>
                    <label className={styles.label}>User (Login Account) *</label>
                    <select className={styles.select} value={form.user_id} onChange={(e) => setForm((p) => ({ ...p, user_id: e.target.value }))} required>
                      <option value="">Select user</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                    <span className={styles.hint}>The Supabase auth user who will log in</span>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Employee (Optional)</label>
                    <select className={styles.select} value={form.employee_id} onChange={(e) => setForm((p) => ({ ...p, employee_id: e.target.value }))}>
                      <option value="">No linked employee</option>
                      {employees.filter((e) => e.employee_status === "active").map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Location *</label>
                    <select className={styles.select} value={form.location_id} onChange={(e) => setForm((p) => ({ ...p, location_id: e.target.value }))} required>
                      <option value="">Select location</option>
                      {locations.filter((l) => l.is_active).map((l) => (
                        <option key={l.id} value={l.id}>{l.location_name} ({l.location_code}) — {l.location_type}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Role *</label>
                    <select className={styles.select} value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} required>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                  {submitting ? "Assigning..." : "Assign Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

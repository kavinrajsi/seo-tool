"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

const EMPTY_FORM = {
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  date_of_joining: "",
  designation: "",
  department: "",
  employee_status: "active",
  role: "",
  work_email: "",
  personal_email: "",
  mobile_number: "",
  mobile_number_emergency: "",
  personal_address_line_1: "",
  personal_address_line_2: "",
  personal_city: "",
  personal_state: "",
  personal_postal_code: "",
  aadhaar_number: "",
  pan_number: "",
  blood_type: "",
  shirt_size: "",
  employee_number: "",
  project_id: "",
};

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On Leave",
  terminated: "Terminated",
};

function StatusBadge({ status }) {
  const map = {
    active: styles.statusActive,
    inactive: styles.statusInactive,
    on_leave: styles.statusOnLeave,
    terminated: styles.statusTerminated,
  };
  return <span className={map[status] || styles.statusActive}>{STATUS_LABELS[status] || status}</span>;
}

function SortHeader({ column, children, style, sortColumn, sortDirection, onSort }) {
  const isActive = sortColumn === column;
  return (
    <th
      className={styles.sortableTh}
      style={style}
      onClick={() => onSort(column)}
    >
      <span className={styles.sortableLabel}>
        {children}
        <svg className={`${styles.sortIcon} ${isActive ? styles.sortIconActive : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          {isActive && sortDirection === "desc" ? (
            <path d="M3 5l3 3 3-3" />
          ) : (
            <path d="M3 7l3-3 3 3" />
          )}
        </svg>
      </span>
    </th>
  );
}

export default function EmployeesPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Bulk import modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState("");

  // Projects list
  const [projectsList, setProjectsList] = useState([]);

  // Address autocomplete
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjectsList(data.projects || []);
        }
      } catch {
        // silent
      }
    }
    fetchProjects();
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await projectFetch(`/api/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load employees");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, [projectFetch]);

  useEffect(() => {
    const fetchData = async () => {
      loadEmployees();
    };
    fetchData();
  }, [activeProjectId, loadEmployees]);

  function openAddModal() {
    setForm(EMPTY_FORM);
    setAddressQuery("");
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(emp) {
    setForm({
      first_name: emp.first_name || "",
      middle_name: emp.middle_name || "",
      last_name: emp.last_name || "",
      gender: emp.gender || "",
      date_of_birth: emp.date_of_birth || "",
      date_of_joining: emp.date_of_joining || "",
      designation: emp.designation || "",
      department: emp.department || "",
      employee_status: emp.employee_status || "active",
      role: emp.role || "",
      work_email: emp.work_email || "",
      personal_email: emp.personal_email || "",
      mobile_number: emp.mobile_number || "",
      mobile_number_emergency: emp.mobile_number_emergency || "",
      personal_address_line_1: emp.personal_address_line_1 || "",
      personal_address_line_2: emp.personal_address_line_2 || "",
      personal_city: emp.personal_city || "",
      personal_state: emp.personal_state || "",
      personal_postal_code: emp.personal_postal_code || "",
      aadhaar_number: emp.aadhaar_number || "",
      pan_number: emp.pan_number || "",
      blood_type: emp.blood_type || "",
      shirt_size: emp.shirt_size || "",
      employee_number: emp.employee_number || "",
      project_id: emp.project_id || "",
    });
    setAddressQuery("");
    setEditingId(emp.id);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormError("");
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Address autocomplete
  async function fetchSuggestions(input) {
    if (!input || input.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch {
      // Silently fail
    }
  }

  function handleAddressInput(value) {
    setAddressQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  async function handleSelectSuggestion(suggestion) {
    setAddressQuery(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(suggestion.placeId)}`);
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          personal_address_line_1: data.address_line_1 || prev.personal_address_line_1,
          personal_city: data.city || prev.personal_city,
          personal_state: data.state || prev.personal_state,
          personal_postal_code: data.postal_code || prev.personal_postal_code,
        }));
      }
    } catch {
      // Silently fail
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const payload = { ...form };
    // Convert empty string project_id to null
    payload.project_id = payload.project_id || null;

    try {
      const url = editingId ? `/api/employees/${editingId}` : "/api/employees";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(editingId ? "Employee updated successfully" : "Employee added successfully");
        closeModal();
        loadEmployees();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setFormError(data.error || "Failed to save employee");
      }
    } catch {
      setFormError("Network error");
    }
    setSubmitting(false);
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Employee deleted");
        loadEmployees();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch {
      setError("Network error");
    }
  }

  // Bulk import
  const CSV_FIELDS = [
    "first_name", "middle_name", "last_name", "gender", "date_of_birth",
    "date_of_joining", "designation", "department", "employee_status", "role",
    "work_email", "personal_email", "mobile_number", "mobile_number_emergency",
    "personal_address_line_1", "personal_address_line_2", "personal_city",
    "personal_state", "personal_postal_code", "aadhaar_number", "pan_number",
    "blood_type", "shirt_size", "employee_number",
  ];

  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { result.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headerLine = parseCSVLine(lines[0]);
    const headers = headerLine.map((h) => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));

    const employees = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && !values[0])) continue;
      const emp = {};
      headers.forEach((h, idx) => {
        emp[h] = values[idx] || "";
      });
      employees.push(emp);
    }
    return employees;
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBulkCsvText(ev.target.result || "");
    };
    reader.readAsText(file);
  }

  function openBulkModal() {
    setBulkCsvText("");
    setBulkFile(null);
    setBulkResult(null);
    setBulkError("");
    setShowBulkModal(true);
  }

  function closeBulkModal() {
    setShowBulkModal(false);
    setBulkResult(null);
    setBulkError("");
  }

  async function handleBulkImport() {
    setBulkError("");
    setBulkResult(null);

    if (!bulkCsvText.trim()) {
      setBulkError("Please paste CSV data or upload a CSV file");
      return;
    }

    const employees = parseCSV(bulkCsvText);
    if (employees.length === 0) {
      setBulkError("No valid employee rows found. Make sure your CSV has a header row and at least one data row.");
      return;
    }

    setBulkImporting(true);
    try {
      const payload = { employees, project_id: activeProjectId || null };
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkResult(data);
        if (data.imported > 0) {
          loadEmployees();
        }
      } else {
        setBulkError(data.error || "Import failed");
      }
    } catch {
      setBulkError("Network error");
    }
    setBulkImporting(false);
  }

  async function downloadTemplate() {
    try {
      const res = await fetch("/api/employees/bulk");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "employees_template.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
  }

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const name = `${e.first_name} ${e.middle_name || ""} ${e.last_name}`.toLowerCase();
    const matchesSearch =
      name.includes(q) ||
      (e.work_email || "").toLowerCase().includes(q) ||
      (e.mobile_number || "").includes(q) ||
      (e.designation || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q) ||
      (e.employee_number || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || e.employee_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function getProjectName(projectId) {
    if (!projectId) return "Unassigned";
    const p = projectsList.find((proj) => proj.id === projectId);
    return p ? p.name : "Unassigned";
  }

  function getSortValue(emp, column) {
    switch (column) {
      case "name":
        return `${emp.first_name} ${emp.middle_name || ""} ${emp.last_name}`.toLowerCase();
      case "email":
        return (emp.work_email || "").toLowerCase();
      case "phone":
        return emp.mobile_number || "";
      case "designation":
        return (emp.designation || "").toLowerCase();
      case "project":
        return getProjectName(emp.project_id).toLowerCase();
      case "status":
        return emp.employee_status || "";
      case "joined":
        return emp.date_of_joining || "";
      default:
        return "";
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    const aVal = getSortValue(a, sortColumn);
    const bVal = getSortValue(b, sortColumn);
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("180px", "28px", "0.5rem")} />
        <div style={b("340px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Name", "Email", "Phone", "Designation", "Project", "Status", "Joined", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1, 2, 3, 4, 5].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6, 7, 8].map((j) => <td key={j}><div style={b("60%", "14px")} /></td>)}</tr>)}</tbody>
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
          <h1 className={styles.heading}>Employees</h1>
          <p className={styles.subheading} style={{ margin: 0 }}>Manage your company employees and their information.</p>
        </div>
        <div className={styles.sectionActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={openBulkModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Bulk Import
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Employee
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && (
        <div className={styles.success} onClick={() => setSuccessMsg("")} style={{ cursor: "pointer" }}>
          {successMsg}
        </div>
      )}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Employees</div>
            <div className={styles.statValue}>{stats.totalEmployees}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.activeCount}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>On Leave</div>
            <div className={styles.statValue} style={{ color: stats.onLeaveCount > 0 ? "var(--color-warning)" : undefined }}>
              {stats.onLeaveCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Inactive</div>
            <div className={styles.statValue}>{stats.inactiveCount}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Employees ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadEmployees}>
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
            placeholder="Search by name, email, phone, designation..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
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
            <p>No employees found. Click &quot;Add Employee&quot; to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <SortHeader column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>Name</SortHeader>
                  <SortHeader column="email" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>Email</SortHeader>
                  <SortHeader column="phone" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>Phone</SortHeader>
                  <SortHeader column="designation" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>Designation</SortHeader>
                  <SortHeader column="project" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>Project</SortHeader>
                  <SortHeader column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>Status</SortHeader>
                  <SortHeader column="joined" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>Joined</SortHeader>
                  <th style={{ width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className={emp.linked_profile_id ? styles.dotGreen : styles.dotYellow} />
                        <span>{emp.first_name} {emp.middle_name ? `${emp.middle_name} ` : ""}{emp.last_name}</span>
                      </div>
                      {emp.employee_number && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginLeft: "0.8rem" }}>#{emp.employee_number}</div>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{emp.work_email || "-"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{emp.mobile_number || "-"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{emp.designation || "-"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{getProjectName(emp.project_id)}</td>
                    <td><StatusBadge status={emp.employee_status} /></td>
                    <td style={{ fontSize: "0.8rem" }}>{formatDate(emp.date_of_joining)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => openEditModal(emp)}
                          title="Edit"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => handleDelete(emp.id)}
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

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeBulkModal(); }}>
          <div className={`${styles.modal} ${styles.modalWide}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Bulk Import Employees</h3>
              <button className={styles.modalClose} onClick={closeBulkModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {bulkError && <div className={styles.error}>{bulkError}</div>}

              {bulkResult ? (
                <div className={styles.bulkResult}>
                  <div className={styles.bulkResultStats}>
                    <div className={styles.bulkResultStat}>
                      <span className={styles.bulkResultLabel}>Total Rows</span>
                      <span className={styles.bulkResultValue}>{bulkResult.total}</span>
                    </div>
                    <div className={styles.bulkResultStat}>
                      <span className={styles.bulkResultLabel}>Imported</span>
                      <span className={`${styles.bulkResultValue} ${styles.accent}`}>{bulkResult.imported}</span>
                    </div>
                    <div className={styles.bulkResultStat}>
                      <span className={styles.bulkResultLabel}>Skipped</span>
                      <span className={styles.bulkResultValue} style={{ color: bulkResult.skipped > 0 ? "var(--color-critical)" : undefined }}>
                        {bulkResult.skipped}
                      </span>
                    </div>
                  </div>

                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div className={styles.bulkErrors}>
                      <div className={styles.bulkErrorsTitle}>Errors ({bulkResult.errors.length})</div>
                      <div className={styles.bulkErrorsList}>
                        {bulkResult.errors.map((err, i) => (
                          <div key={i} className={styles.bulkErrorRow}>
                            <span className={styles.bulkErrorRowNum}>Row {err.row}</span>
                            <span>{err.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.form}>
                  <p className={styles.bulkDesc}>
                    Upload a CSV file or paste CSV data below. The first row must be a header row with column names.
                  </p>

                  <div className={styles.bulkActions}>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={downloadTemplate}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download Template
                    </button>
                    <label className={`${styles.btn} ${styles.btnSecondary} ${styles.fileLabel}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {bulkFile ? bulkFile.name : "Upload CSV"}
                      <input type="file" accept=".csv,text/csv" onChange={handleFileChange} style={{ display: "none" }} />
                    </label>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>CSV Data</label>
                    <textarea
                      className={styles.bulkTextarea}
                      rows={12}
                      placeholder={`first_name,middle_name,last_name,gender,date_of_birth,date_of_joining,designation,department,employee_status,role,work_email,personal_email,mobile_number,mobile_number_emergency,personal_address_line_1,personal_address_line_2,personal_city,personal_state,personal_postal_code,aadhaar_number,pan_number,blood_type,shirt_size,employee_number\nJohn,,Doe,Male,01-15-1990,01-01-2024,Software Engineer,Engineering,active,Developer,john@company.com,john@gmail.com,9876543210,9876543211,123 Main St,Apt 4,Chennai,Tamil Nadu,600001,123456789012,ABCDE1234F,O+,L,EMP001`}
                      value={bulkCsvText}
                      onChange={(e) => setBulkCsvText(e.target.value)}
                    />
                    <span className={styles.hint}>Paste CSV data with header row. Dates should be in MM-DD-YYYY format (e.g. 01-15-1990).</span>
                  </div>

                  <div className={styles.bulkFieldList}>
                    <div className={styles.bulkFieldListTitle}>Required Fields</div>
                    <div className={styles.bulkFieldTags}>
                      {["first_name", "last_name", "gender", "date_of_birth", "date_of_joining", "employee_status", "role", "work_email", "personal_email", "mobile_number", "mobile_number_emergency", "personal_address_line_1", "personal_address_line_2", "personal_city", "personal_state", "personal_postal_code", "aadhaar_number", "pan_number", "blood_type", "shirt_size"].map((f) => (
                        <span key={f} className={styles.bulkFieldTag}>{f}</span>
                      ))}
                    </div>
                    <div className={styles.bulkFieldListTitle} style={{ marginTop: "0.75rem" }}>Optional Fields</div>
                    <div className={styles.bulkFieldTags}>
                      {["middle_name", "designation", "department", "employee_number"].map((f) => (
                        <span key={f} className={`${styles.bulkFieldTag} ${styles.bulkFieldTagOptional}`}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              {bulkResult ? (
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={closeBulkModal}>Done</button>
              ) : (
                <>
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeBulkModal}>Cancel</button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleBulkImport}
                    disabled={bulkImporting || !bulkCsvText.trim()}
                  >
                    {bulkImporting ? "Importing..." : "Import Employees"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Employee Drawer */}
      {showModal && (
        <>
          <div className={styles.drawerOverlay} onClick={closeModal} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>{editingId ? "Edit Employee" : "Add Employee"}</h3>
              <button className={styles.drawerClose} onClick={closeModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.drawerBody}>
                {formError && <div className={styles.error}>{formError}</div>}
                <div className={styles.form}>

                  {/* Personal Information */}
                  <div className={styles.formSection}>Personal Information</div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>First Name *</label>
                      <input className={styles.input} type="text" value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Middle Name</label>
                      <input className={styles.input} type="text" value={form.middle_name} onChange={(e) => updateField("middle_name", e.target.value)} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Last Name *</label>
                    <input className={styles.input} type="text" value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} required />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Gender *</label>
                      <select className={styles.select} value={form.gender} onChange={(e) => updateField("gender", e.target.value)} required>
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Date of Birth *</label>
                      <input className={styles.input} type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} required />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Blood Type *</label>
                      <input className={styles.input} list="blood-types" value={form.blood_type} onChange={(e) => updateField("blood_type", e.target.value)} placeholder="Select or type" required />
                      <datalist id="blood-types">
                        <option value="A+" />
                        <option value="A-" />
                        <option value="B+" />
                        <option value="B-" />
                        <option value="AB+" />
                        <option value="AB-" />
                        <option value="O+" />
                        <option value="O-" />
                      </datalist>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Shirt Size *</label>
                      <select className={styles.select} value={form.shirt_size} onChange={(e) => updateField("shirt_size", e.target.value)} required>
                        <option value="">Select size</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="XXXL">XXXL</option>
                      </select>
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className={styles.formSection}>Employment Details</div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Employee ID</label>
                      <input className={styles.input} type="text" value={form.employee_number} onChange={(e) => updateField("employee_number", e.target.value)} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Date of Joining *</label>
                      <input className={styles.input} type="date" value={form.date_of_joining} onChange={(e) => updateField("date_of_joining", e.target.value)} required />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Designation</label>
                      <input className={styles.input} type="text" value={form.designation} onChange={(e) => updateField("designation", e.target.value)} />
                      <span className={styles.noteText}>Please leave empty if not applicable</span>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Department</label>
                      <input className={styles.input} type="text" value={form.department} onChange={(e) => updateField("department", e.target.value)} />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Employee Status *</label>
                      <select className={styles.select} value={form.employee_status} onChange={(e) => updateField("employee_status", e.target.value)} required>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="on_leave">On Leave</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Role *</label>
                      <input className={styles.input} type="text" value={form.role} onChange={(e) => updateField("role", e.target.value)} required />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Project</label>
                    <select className={styles.select} value={form.project_id} onChange={(e) => updateField("project_id", e.target.value)}>
                      <option value="">Unassigned</option>
                      {projectsList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Work Email *</label>
                    <input className={styles.input} type="email" value={form.work_email} onChange={(e) => updateField("work_email", e.target.value)} required />
                    <span className={styles.noteText}>Please use your personal email if a work email ID is not available</span>
                  </div>

                  {/* Contact Information */}
                  <div className={styles.formSection}>Contact Information</div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Personal Email *</label>
                      <input className={styles.input} type="email" value={form.personal_email} onChange={(e) => updateField("personal_email", e.target.value)} required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Mobile Number *</label>
                      <input className={styles.input} type="tel" value={form.mobile_number} onChange={(e) => updateField("mobile_number", e.target.value)} required />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Emergency Mobile Number *</label>
                    <input className={styles.input} type="tel" value={form.mobile_number_emergency} onChange={(e) => updateField("mobile_number_emergency", e.target.value)} required />
                  </div>

                  {/* Address */}
                  <div className={styles.formSection}>Address</div>

                  <div className={styles.field} ref={suggestionsRef}>
                    <label className={styles.label}>Search Address</label>
                    <div className={styles.addressSearchWrap}>
                      <input
                        className={styles.addressSearch}
                        type="text"
                        placeholder="Start typing an address..."
                        value={addressQuery}
                        onChange={(e) => handleAddressInput(e.target.value)}
                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className={styles.suggestionsList}>
                          {suggestions.map((s) => (
                            <li key={s.placeId} className={styles.suggestionItem} onClick={() => handleSelectSuggestion(s)}>
                              {s.description}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className={styles.hint}>Search to auto-fill the address fields below</span>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Address Line 1 *</label>
                      <input className={styles.input} type="text" value={form.personal_address_line_1} onChange={(e) => updateField("personal_address_line_1", e.target.value)} required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Address Line 2 *</label>
                      <input className={styles.input} type="text" value={form.personal_address_line_2} onChange={(e) => updateField("personal_address_line_2", e.target.value)} required />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>City *</label>
                      <input className={styles.input} type="text" value={form.personal_city} onChange={(e) => updateField("personal_city", e.target.value)} required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>State *</label>
                      <input className={styles.input} type="text" value={form.personal_state} onChange={(e) => updateField("personal_state", e.target.value)} required />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Postal Code *</label>
                    <input className={styles.input} type="text" value={form.personal_postal_code} onChange={(e) => updateField("personal_postal_code", e.target.value)} required />
                  </div>

                  {/* Identification */}
                  <div className={styles.formSection}>Identification</div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Aadhaar Number *</label>
                      <input className={styles.input} type="text" value={form.aadhaar_number} onChange={(e) => updateField("aadhaar_number", e.target.value)} required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>PAN Number *</label>
                      <input className={styles.input} type="text" value={form.pan_number} onChange={(e) => updateField("pan_number", e.target.value)} required style={{ textTransform: "uppercase" }} />
                    </div>
                  </div>

                </div>
              </div>
              <div className={styles.drawerFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update Employee" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

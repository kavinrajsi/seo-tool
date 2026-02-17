"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./page.module.css";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  mobile_number: "",
  position: "",
  job_role: "",
  file_url: "",
  portfolio: "",
  status: "new",
  offer_status: "",
  location: "",
  source_url: "",
  ip_address: "",
  notes: "",
};

const STATUSES = ["new", "screening", "interview", "offer", "hired", "rejected", "on_hold"];
const OFFER_STATUSES = ["pending", "sent", "accepted", "declined", "negotiating", "withdrawn"];

const STATUS_LABELS = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  on_hold: "On Hold",
};

const OFFER_LABELS = {
  pending: "Pending",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  negotiating: "Negotiating",
  withdrawn: "Withdrawn",
};

const EMAIL_TEMPLATES = {
  interview_invite: {
    label: "Interview Invite",
    subject: "Interview Invitation — {{position}} at Our Agency",
    body: `Dear {{first_name}},

Thank you for your interest in the {{position}} role ({{job_role}}) at our agency.

We are pleased to invite you for an interview to discuss this opportunity further. Please let us know your availability over the next few days so we can schedule a convenient time.

We look forward to speaking with you.

Best regards,
The Hiring Team`,
  },
  offer_letter: {
    label: "Offer Letter",
    subject: "Offer Letter — {{position}}",
    body: `Dear {{first_name}},

Congratulations! We are delighted to extend an offer for the position of {{position}} ({{job_role}}) at our agency.

We were impressed with your profile and believe you will be a valuable addition to our team. Please find the details of the offer below and let us know if you have any questions.

Next Steps:
- Review the offer details
- Confirm your acceptance at your earliest convenience
- We will share onboarding information upon acceptance

Welcome aboard!

Best regards,
The Hiring Team`,
  },
  rejection: {
    label: "Rejection",
    subject: "Application Update — {{position}}",
    body: `Dear {{first_name}},

Thank you for taking the time to apply for the {{position}} position at our agency.

After careful consideration, we have decided to move forward with other candidates at this time. This was a difficult decision, and we genuinely appreciate your interest in joining our team.

We encourage you to apply for future openings that match your skills and experience. We wish you all the best in your career journey.

Kind regards,
The Hiring Team`,
  },
  custom: {
    label: "Custom",
    subject: "",
    body: "",
  },
};

function replacePlaceholders(text, emp) {
  if (!text) return text;
  return text
    .replace(/\{\{first_name\}\}/g, emp.first_name || "")
    .replace(/\{\{last_name\}\}/g, emp.last_name || "")
    .replace(/\{\{position\}\}/g, emp.position || "the position")
    .replace(/\{\{job_role\}\}/g, emp.job_role || "the role")
    .replace(/\{\{email\}\}/g, emp.email || "")
    .replace(/\{\{candidate_id\}\}/g, emp.candidate_id || "")
    .replace(/\{\{job_id\}\}/g, emp.job_id || "")
    .replace(/\{\{location\}\}/g, emp.location || "");
}

function PipelineBadge({ status }) {
  const map = {
    new: styles.pipelineNew,
    screening: styles.pipelineScreening,
    interview: styles.pipelineInterview,
    offer: styles.pipelineOffer,
    hired: styles.pipelineHired,
    rejected: styles.pipelineRejected,
    on_hold: styles.pipelineOnHold,
  };
  return <span className={map[status] || styles.pipelineNew}>{STATUS_LABELS[status] || status}</span>;
}

function OfferBadge({ status }) {
  if (!status) return <span style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>-</span>;
  const map = {
    pending: styles.offerPending,
    sent: styles.offerSent,
    accepted: styles.offerAccepted,
    declined: styles.offerDeclined,
    negotiating: styles.offerNegotiating,
    withdrawn: styles.offerWithdrawn,
  };
  return <span className={map[status] || styles.offerPending}>{OFFER_LABELS[status] || status}</span>;
}

export default function RecruitSmartPage() {
  const { activeProject } = useProject();
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // list | card | kanban
  const [dragItem, setDragItem] = useState(null);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailEmployee, setEmailEmployee] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState("interview_invite");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // CSV import
  const fileInputRef = useRef(null);

  async function loadCandidates() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("project_id", activeProject.id);
      const res = await fetch(`/api/recruitsmart?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.employees || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load candidates");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCandidates();
  }, [activeProject]);

  function openAddModal() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(emp) {
    setForm({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      email: emp.email || "",
      mobile_number: emp.mobile_number || "",
      position: emp.position || "",
      job_role: emp.job_role || "",
      file_url: emp.file_url || "",
      portfolio: emp.portfolio || "",
      status: emp.status || "new",
      offer_status: emp.offer_status || "",
      location: emp.location || "",
      source_url: emp.source_url || "",
      ip_address: emp.ip_address || "",
      notes: emp.notes || "",
    });
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

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const payload = { ...form, project_id: activeProject?.id || null };
    if (!payload.offer_status) delete payload.offer_status;

    try {
      const url = editingId ? `/api/recruitsmart/${editingId}` : "/api/recruitsmart";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(editingId ? "Candidate updated successfully" : "Candidate added successfully");
        closeModal();
        loadCandidates();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setFormError(data.error || "Failed to save candidate");
      }
    } catch {
      setFormError("Network error");
    }
    setSubmitting(false);
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/recruitsmart/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Candidate deleted");
        loadCandidates();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch {
      setError("Network error");
    }
  }

  // Email
  function openEmailModal(emp) {
    setEmailEmployee(emp);
    setEmailTemplate("interview_invite");
    const tpl = EMAIL_TEMPLATES.interview_invite;
    setEmailSubject(replacePlaceholders(tpl.subject, emp));
    setEmailBody(replacePlaceholders(tpl.body, emp));
    setShowEmailModal(true);
  }

  function handleTemplateChange(templateType) {
    setEmailTemplate(templateType);
    const tpl = EMAIL_TEMPLATES[templateType];
    if (emailEmployee) {
      setEmailSubject(templateType === "custom" ? "" : replacePlaceholders(tpl.subject, emailEmployee));
      setEmailBody(templateType === "custom" ? "" : replacePlaceholders(tpl.body, emailEmployee));
    }
  }

  async function handleSendEmail() {
    if (!emailEmployee || !emailSubject.trim() || !emailBody.trim()) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/recruitsmart/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: emailEmployee.id,
          templateType: emailTemplate,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Email sent to ${emailEmployee.email}`);
        setShowEmailModal(false);
        setEmailEmployee(null);
        loadCandidates();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setError(data.error || "Failed to send email");
      }
    } catch {
      setError("Network error sending email");
    }
    setSendingEmail(false);
  }

  // CSV Import
  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map((row) => ({
          first_name: row.first_name || row["First Name"] || "",
          last_name: row.last_name || row["Last Name"] || "",
          email: row.email || row["Email"] || "",
          mobile_number: row.mobile_number || row["Phone"] || row["Mobile"] || "",
          position: row.position || row["Position"] || "",
          job_role: row.job_role || row["Job Role"] || "",
          location: row.location || row["Location"] || "",
          status: row.status || row["Status"] || "new",
          offer_status: row.offer_status || row["Offer Status"] || "",
          file_url: row.file_url || row["Resume URL"] || "",
          portfolio: row.portfolio || row["Portfolio"] || "",
          source_url: row.source_url || row["Source URL"] || "",
          ip_address: row.ip_address || row["IP Address"] || "",
          notes: row.notes || row["Notes"] || "",
          job_id: row.job_id || row["Job ID"] || "",
          candidate_id: row.candidate_id || row["Candidate ID"] || "",
        })).filter((r) => r.first_name && r.last_name);

        if (rows.length === 0) {
          setError("No valid rows found in CSV. Ensure first_name and last_name columns exist.");
          return;
        }

        try {
          const payload = { rows, project_id: activeProject?.id || null };
          const res = await fetch("/api/recruitsmart/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (res.ok) {
            const msg = `Imported ${data.imported} candidates${data.errors?.length ? ` (${data.errors.length} errors)` : ""}`;
            setSuccessMsg(msg);
            loadCandidates();
            setTimeout(() => setSuccessMsg(""), 5000);
          } else {
            setError(data.error || "Import failed");
          }
        } catch {
          setError("Network error during import");
        }
      },
      error: () => {
        setError("Failed to parse CSV file");
      },
    });
    e.target.value = "";
  }

  // CSV Export
  function handleExport() {
    const headers = ["Candidate ID", "Job ID", "First Name", "Last Name", "Email", "Phone", "Position", "Job Role", "Status", "Offer Status", "Location", "Resume URL", "Portfolio", "Source URL", "IP Address", "Notes", "Created At"];
    const rows = [headers];
    for (const emp of candidates) {
      rows.push([
        emp.candidate_id || "",
        emp.job_id || "",
        emp.first_name || "",
        emp.last_name || "",
        emp.email || "",
        emp.mobile_number || "",
        emp.position || "",
        emp.job_role || "",
        emp.status || "",
        emp.offer_status || "",
        emp.location || "",
        emp.file_url || "",
        emp.portfolio || "",
        emp.source_url || "",
        emp.ip_address || "",
        (emp.notes || "").replace(/"/g, '""'),
        emp.created_at || "",
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recruitsmart-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Kanban drag-and-drop
  async function handleDrop(newStatus) {
    if (!dragItem || dragItem.status === newStatus) {
      setDragItem(null);
      return;
    }
    try {
      const res = await fetch(`/api/recruitsmart/${dragItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCandidates((prev) =>
          prev.map((c) => c.id === dragItem.id ? { ...c, status: newStatus } : c)
        );
      }
    } catch {
      // silent
    }
    setDragItem(null);
  }

  // Get unique job roles for filter
  const jobRoles = [...new Set(candidates.map((e) => e.job_role).filter(Boolean))].sort();

  const filtered = candidates.filter((e) => {
    const q = search.toLowerCase();
    const name = `${e.first_name} ${e.last_name}`.toLowerCase();
    const matchesSearch =
      name.includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.mobile_number || "").includes(q) ||
      (e.position || "").toLowerCase().includes(q) ||
      (e.candidate_id || "").toLowerCase().includes(q) ||
      (e.job_id || "").toLowerCase().includes(q) ||
      (e.location || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesRole = roleFilter === "all" || e.job_role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
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
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["ID", "Name", "Email", "Position", "Status", "Offer", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1, 2, 3, 4, 5].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6, 7].map((j) => <td key={j}><div style={b(j === 1 ? "70px" : "60%", "14px")} /></td>)}</tr>)}</tbody>
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
          <h1 className={styles.heading}>RecruitSmart</h1>
          <p className={styles.subheading} style={{ margin: 0 }}>Recruitment pipeline and candidate management for your agency.</p>
        </div>
        <div className={styles.sectionActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Candidate
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
            <div className={styles.statLabel}>Total Candidates</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>New</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.newCount}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Interview</div>
            <div className={styles.statValue} style={{ color: stats.interviewCount > 0 ? "var(--color-warning)" : undefined }}>
              {stats.interviewCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Hired</div>
            <div className={styles.statValue} style={{ color: stats.hiredCount > 0 ? "var(--color-pass)" : undefined }}>
              {stats.hiredCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Offers Accepted</div>
            <div className={styles.statValue} style={{ color: stats.offersAccepted > 0 ? "var(--color-pass)" : undefined }}>
              {stats.offersAccepted}
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Candidates ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleImportClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Import CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" className={styles.hiddenInput} onChange={handleFileChange} />
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleExport} disabled={candidates.length === 0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Export CSV
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadCandidates}>
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
            placeholder="Search by name, email, ID, position, location..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          {jobRoles.length > 0 && (
            <select className={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              {jobRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === "list" ? styles.viewToggleBtnActive : ""}`}
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === "card" ? styles.viewToggleBtnActive : ""}`}
              onClick={() => setViewMode("card")}
              title="Card View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === "kanban" ? styles.viewToggleBtnActive : ""}`}
              onClick={() => setViewMode("kanban")}
              title="Kanban View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="6" height="18" rx="1" /><rect x="9" y="3" width="6" height="12" rx="1" /><rect x="16" y="3" width="6" height="15" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        {filtered.length === 0 && viewMode !== "kanban" ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>No candidates found. Click &quot;Add Candidate&quot; to get started or import a CSV.</p>
          </div>
        ) : viewMode === "kanban" ? (
          /* Kanban Board */
          <div className={styles.kanbanBoard}>
            {STATUSES.map((status) => {
              const colItems = filtered.filter((e) => e.status === status);
              return (
                <div key={status} className={styles.kanbanColumn}>
                  <div className={styles.kanbanColumnHeader}>
                    <span className={styles.kanbanColumnTitle}>{STATUS_LABELS[status]}</span>
                    <span className={styles.kanbanColumnCount}>{colItems.length}</span>
                  </div>
                  <div
                    className={styles.kanbanColumnBody}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.dragOver); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove(styles.dragOver); }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove(styles.dragOver); handleDrop(status); }}
                  >
                    {colItems.length === 0 ? (
                      <div className={styles.kanbanEmpty}>No candidates</div>
                    ) : colItems.map((emp) => (
                      <div
                        key={emp.id}
                        className={`${styles.kanbanCard} ${dragItem?.id === emp.id ? styles.dragging : ""}`}
                        draggable
                        onDragStart={() => setDragItem(emp)}
                        onDragEnd={() => setDragItem(null)}
                      >
                        <div className={styles.kanbanCardName}>{emp.first_name} {emp.last_name}</div>
                        {emp.position && <div className={styles.kanbanCardPosition}>{emp.position}</div>}
                        {emp.offer_status && (
                          <div style={{ marginBottom: "0.375rem" }}><OfferBadge status={emp.offer_status} /></div>
                        )}
                        <div className={styles.kanbanCardMeta}>
                          <span className={styles.kanbanCardEmail}>{emp.email || emp.mobile_number || ""}</span>
                          <div className={styles.kanbanCardActions}>
                            <button className={styles.kanbanCardBtn} onClick={() => openEditModal(emp)} title="Edit">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button className={`${styles.kanbanCardBtn} ${styles.kanbanCardBtnDanger}`} onClick={() => handleDelete(emp.id)} title="Delete">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "card" ? (
          /* Card Grid View */
          <div className={styles.cardGrid}>
            {filtered.map((emp) => (
              <div key={emp.id} className={styles.candidateCard}>
                <div className={styles.candidateCardHeader}>
                  <div>
                    <div className={styles.candidateCardName}>
                      {emp.first_name} {emp.last_name}
                      {emp.linked_profile_id && <span className={styles.linkedBadge}>linked</span>}
                    </div>
                    <div className={styles.candidateCardId}>{emp.candidate_id}</div>
                  </div>
                  <div className={styles.candidateCardBadges}>
                    <PipelineBadge status={emp.status} />
                    {emp.offer_status && <OfferBadge status={emp.offer_status} />}
                  </div>
                </div>
                <div className={styles.candidateCardBody}>
                  {emp.position && (
                    <div className={styles.candidateCardRow}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                      </svg>
                      {emp.position}{emp.job_role ? ` — ${emp.job_role}` : ""}
                    </div>
                  )}
                  {emp.email && (
                    <div className={styles.candidateCardRow}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                      </svg>
                      {emp.email}
                    </div>
                  )}
                  {emp.mobile_number && (
                    <div className={styles.candidateCardRow}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                      {emp.mobile_number}
                    </div>
                  )}
                  {emp.location && (
                    <div className={styles.candidateCardRow}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      {emp.location}
                    </div>
                  )}
                </div>
                <div className={styles.candidateCardFooter}>
                  <span className={styles.candidateCardDate}>{formatDate(emp.created_at)}</span>
                  <div className={styles.candidateCardActions}>
                    {emp.email && (
                      <button className={styles.kanbanCardBtn} onClick={() => openEmailModal(emp)} title="Send Email">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                        </svg>
                      </button>
                    )}
                    <button className={styles.kanbanCardBtn} onClick={() => openEditModal(emp)} title="Edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className={`${styles.kanbanCardBtn} ${styles.kanbanCardBtnDanger}`} onClick={() => handleDelete(emp.id)} title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List/Table View */
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Candidate ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Position</th>
                  <th>Job Role</th>
                  <th>Status</th>
                  <th>Offer Status</th>
                  <th>Location</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: "0.8rem", fontFamily: "monospace" }}>{emp.candidate_id}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>{emp.job_id}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {emp.first_name} {emp.last_name}
                        {emp.linked_profile_id && <span className={styles.linkedBadge}>linked</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{emp.email || "-"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{emp.mobile_number || "-"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{emp.position || "-"}</td>
                    <td style={{ fontSize: "0.8rem" }}>{emp.job_role || "-"}</td>
                    <td><PipelineBadge status={emp.status} /></td>
                    <td><OfferBadge status={emp.offer_status} /></td>
                    <td style={{ fontSize: "0.8rem" }}>{emp.location || "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                        {/* Expand/Collapse */}
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                          title="View Details"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {expandedId === emp.id
                              ? <polyline points="18 15 12 9 6 15" />
                              : <polyline points="6 9 12 15 18 9" />
                            }
                          </svg>
                        </button>
                        {/* Resume */}
                        {emp.file_url && (
                          <a
                            href={emp.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", textDecoration: "none" }}
                            title="View Resume"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </a>
                        )}
                        {/* Email */}
                        {emp.email && (
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => openEmailModal(emp)}
                            title="Send Email"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </button>
                        )}
                        {/* Edit */}
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
                        {/* Delete */}
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
                      {/* Expanded Detail */}
                      {expandedId === emp.id && (
                        <div className={styles.detailRow}>
                          <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Job ID</span>
                              <span className={styles.detailValue}>{emp.job_id || "-"}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Portfolio</span>
                              {emp.portfolio ? (
                                <a href={emp.portfolio} target="_blank" rel="noopener noreferrer" className={styles.detailLink}>{emp.portfolio}</a>
                              ) : (
                                <span className={styles.detailValue}>-</span>
                              )}
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Resume</span>
                              {emp.file_url ? (
                                <a href={emp.file_url} target="_blank" rel="noopener noreferrer" className={styles.detailLink}>View Resume</a>
                              ) : (
                                <span className={styles.detailValue}>-</span>
                              )}
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Source URL</span>
                              {emp.source_url ? (
                                <a href={emp.source_url} target="_blank" rel="noopener noreferrer" className={styles.detailLink}>{emp.source_url}</a>
                              ) : (
                                <span className={styles.detailValue}>-</span>
                              )}
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>IP Address</span>
                              <span className={styles.detailValue}>{emp.ip_address || "-"}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Created</span>
                              <span className={styles.detailValue}>{formatDate(emp.created_at)}</span>
                            </div>
                          </div>
                          {emp.notes && (
                            <div className={styles.detailNotes}>
                              <strong style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Notes:</strong><br />
                              {emp.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Candidate Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={`${styles.modal} ${styles.modalWide}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingId ? "Edit Candidate" : "Add Candidate"}</h3>
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
                      <label className={styles.label}>First Name *</label>
                      <input className={styles.input} type="text" value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Last Name *</label>
                      <input className={styles.input} type="text" value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} required />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Email</label>
                      <input className={styles.input} type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Phone</label>
                      <input className={styles.input} type="tel" value={form.mobile_number} onChange={(e) => updateField("mobile_number", e.target.value)} />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Position</label>
                      <input className={styles.input} type="text" value={form.position} onChange={(e) => updateField("position", e.target.value)} placeholder="e.g. Senior Designer" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Job Role</label>
                      <input className={styles.input} type="text" value={form.job_role} onChange={(e) => updateField("job_role", e.target.value)} placeholder="e.g. UI/UX Design" />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Pipeline Status</label>
                      <select className={styles.select} value={form.status} onChange={(e) => updateField("status", e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Offer Status</label>
                      <select className={styles.select} value={form.offer_status} onChange={(e) => updateField("offer_status", e.target.value)}>
                        <option value="">None</option>
                        {OFFER_STATUSES.map((s) => <option key={s} value={s}>{OFFER_LABELS[s]}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Location</label>
                      <input className={styles.input} type="text" value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="e.g. Chennai, India" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>IP Address</label>
                      <input className={styles.input} type="text" value={form.ip_address} onChange={(e) => updateField("ip_address", e.target.value)} />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Resume URL</label>
                      <input className={styles.input} type="url" value={form.file_url} onChange={(e) => updateField("file_url", e.target.value)} placeholder="https://..." />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Portfolio URL</label>
                      <input className={styles.input} type="url" value={form.portfolio} onChange={(e) => updateField("portfolio", e.target.value)} placeholder="https://..." />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Source URL</label>
                    <input className={styles.input} type="url" value={form.source_url} onChange={(e) => updateField("source_url", e.target.value)} placeholder="Where did this candidate apply from?" />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <textarea className={styles.textarea} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Internal notes about this candidate..." rows={3} style={{ minHeight: "70px" }} />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update Candidate" : "Add Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && emailEmployee && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowEmailModal(false); setEmailEmployee(null); } }}>
          <div className={`${styles.modal} ${styles.modalWide}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Send Email to {emailEmployee.first_name} {emailEmployee.last_name}</h3>
              <button className={styles.modalClose} onClick={() => { setShowEmailModal(false); setEmailEmployee(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.hint} style={{ marginBottom: "1rem" }}>
                Sending to: <strong style={{ color: "var(--color-text)" }}>{emailEmployee.email}</strong>
              </div>

              <div className={styles.templateSelector}>
                {Object.entries(EMAIL_TEMPLATES).map(([key, tpl]) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.templateBtn} ${emailTemplate === key ? styles.templateBtnActive : ""}`}
                    onClick={() => handleTemplateChange(key)}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Subject</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject..."
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Body</label>
                  <textarea
                    className={styles.textarea}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Email body..."
                    rows={10}
                    style={{ minHeight: "200px" }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setShowEmailModal(false); setEmailEmployee(null); }}>
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
              >
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

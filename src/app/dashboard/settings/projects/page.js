"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "../page.module.css";

const COLORS = [
  "#8fff00", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#6366f1",
];

function ColorPicker({ value, onChange }) {
  return (
    <div className={styles.colorPickerRow}>
      <span className={styles.colorLabel}>Color</span>
      <div className={styles.colorOptions}>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.colorSwatch} ${value === c ? styles.colorSwatchActive : ""}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, activeProject, setActiveProject, refreshProjects } = useProject();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", color: "#8fff00", website_url: "" });
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", color: "#8fff00", website_url: "" });
  const [saving, setSaving] = useState(false);

  // Invite form
  const [invitingId, setInvitingId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  // Members
  const [members, setMembers] = useState([]);
  const [membersProjectId, setMembersProjectId] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Team employees
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assigningEmployee, setAssigningEmployee] = useState(false);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.name.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProjects();
        setActiveProject(data);
        setCreateForm({ name: "", description: "", color: "#8fff00", website_url: "" });
        setShowCreate(false);
        showSuccess("Project created successfully");
      } else {
        setError(data.error || "Failed to create project");
      }
    } catch {
      setError("Network error");
    }
    setCreating(false);
  }

  function openEdit(project) {
    setEditingId(project.id);
    setEditForm({
      name: project.name || "",
      description: project.description || "",
      color: project.color || "#8fff00",
      website_url: project.website_url || "",
    });
    setError("");
    loadTeamEmployees(project.id);
  }

  function closeEdit() {
    setEditingId(null);
    setError("");
    setTeamEmployees([]);
    setUnassignedEmployees([]);
    setSelectedEmployee("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!editForm.name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProjects();
        if (activeProject?.id === editingId) {
          setActiveProject({ ...activeProject, ...data });
        }
        closeEdit();
        showSuccess("Project updated");
      } else {
        setError(data.error || "Failed to update project");
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this project? This cannot be undone. All project-scoped data will lose its project association.")) return;
    setError("");
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshProjects();
        if (activeProject?.id === id) {
          setActiveProject(null);
        }
        if (editingId === id) closeEdit();
        showSuccess("Project deleted");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete project");
      }
    } catch {
      setError("Network error");
    }
  }

  async function loadMembers(projectId) {
    if (membersProjectId === projectId) {
      setMembersProjectId(null);
      setMembers([]);
      return;
    }
    setLoadingMembers(true);
    setMembersProjectId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers([]);
      }
    } catch {
      // silent
    }
    setLoadingMembers(false);
  }

  async function loadTeamEmployees(projectId) {
    setLoadingTeam(true);
    try {
      const [assignedRes, unassignedRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/employees`),
        fetch(`/api/projects/${projectId}/employees?unassigned=true`),
      ]);
      if (assignedRes.ok) {
        const data = await assignedRes.json();
        setTeamEmployees(data.employees || []);
      }
      if (unassignedRes.ok) {
        const data = await unassignedRes.json();
        setUnassignedEmployees(data.employees || []);
      }
    } catch {
      // silent
    }
    setLoadingTeam(false);
  }

  async function handleAssignEmployee(projectId) {
    if (!selectedEmployee || assigningEmployee) return;
    setAssigningEmployee(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployee}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (res.ok) {
        setSelectedEmployee("");
        await loadTeamEmployees(projectId);
        showSuccess("Employee assigned to project");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to assign employee");
      }
    } catch {
      setError("Network error");
    }
    setAssigningEmployee(false);
  }

  async function handleUnassignEmployee(employeeId, projectId) {
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: null }),
      });
      if (res.ok) {
        await loadTeamEmployees(projectId);
        showSuccess("Employee removed from project");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove employee");
      }
    } catch {
      setError("Network error");
    }
  }

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <>
      <h1 className={styles.heading}>Projects</h1>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && <div className={styles.success}>{successMsg}</div>}

      <div className={styles.section}>
        <div className={styles.projectHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Your Projects</h2>
            <p className={styles.sectionDesc}>Create and manage projects to organize your data across features.</p>
          </div>
          <button
            className={styles.newProjectBtn}
            onClick={() => { setShowCreate(!showCreate); setError(""); }}
            type="button"
          >
            {showCreate ? "Cancel" : "+ New Project"}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form className={styles.projectForm} onSubmit={handleCreate}>
            <div className={styles.projectFormRow}>
              <div className={styles.field}>
                <label className={styles.label}>Project Name *</label>
                <input
                  className={styles.input}
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Client Website"
                  required
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Website URL</label>
                <input
                  className={styles.input}
                  type="url"
                  value={createForm.website_url}
                  onChange={(e) => setCreateForm((p) => ({ ...p, website_url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <input
                className={styles.input}
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description (optional)"
              />
            </div>
            <ColorPicker value={createForm.color} onChange={(c) => setCreateForm((p) => ({ ...p, color: c }))} />
            <button className={styles.saveBtn} type="submit" disabled={creating || !createForm.name.trim()}>
              {creating ? "Creating..." : "Create Project"}
            </button>
          </form>
        )}

        {/* Project list */}
        {projects.length === 0 && !showCreate ? (
          <div className={styles.projectEmpty}>
            No projects yet. Create one to start organizing your data.
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {projects.map((project) => (
              <div key={project.id}>
                {editingId === project.id ? (
                  /* Edit form inline */
                  <form className={styles.projectForm} onSubmit={handleSave} style={{ marginBottom: 0 }}>
                    <div className={styles.projectFormRow}>
                      <div className={styles.field}>
                        <label className={styles.label}>Project Name *</label>
                        <input
                          className={styles.input}
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          required
                          autoFocus
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Website URL</label>
                        <input
                          className={styles.input}
                          type="url"
                          value={editForm.website_url}
                          onChange={(e) => setEditForm((p) => ({ ...p, website_url: e.target.value }))}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Description</label>
                      <input
                        className={styles.input}
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Brief description (optional)"
                      />
                    </div>
                    <ColorPicker value={editForm.color} onChange={(c) => setEditForm((p) => ({ ...p, color: c }))} />
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <button className={styles.saveBtn} type="submit" disabled={saving || !editForm.name.trim()}>
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        className={styles.dangerBtn}
                        type="button"
                        onClick={() => handleDelete(project.id)}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={closeEdit}
                        style={{
                          padding: "10px 24px",
                          background: "transparent",
                          color: "#6b7280",
                          border: "1px solid #e5e7eb",
                          borderRadius: "var(--radius-md)",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Team Members */}
                    <div className={styles.teamSection}>
                      <div className={styles.teamSectionTitle}>Team Members</div>
                      {loadingTeam ? (
                        <div className={styles.teamEmpty}>Loading team members...</div>
                      ) : (
                        <>
                          {teamEmployees.length > 0 ? (
                            <div className={styles.teamMemberList}>
                              {teamEmployees.map((emp) => (
                                <div key={emp.id} className={styles.teamMemberRow}>
                                  <div className={styles.teamMemberInfo}>
                                    <span className={styles.teamMemberName}>
                                      {emp.first_name} {emp.last_name}
                                      <span className={`${styles.teamStatusBadge} ${emp.employee_status === "active" ? styles.teamStatusActive : styles.teamStatusInactive}`}>
                                        {emp.employee_status}
                                      </span>
                                    </span>
                                    <span className={styles.teamMemberMeta}>
                                      {emp.designation || "No designation"} {emp.work_email ? `· ${emp.work_email}` : ""}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className={styles.removeBtn}
                                    onClick={() => handleUnassignEmployee(emp.id, project.id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.teamEmpty}>No employees assigned to this project yet.</div>
                          )}

                          {unassignedEmployees.length > 0 && (
                            <div className={styles.teamAddRow}>
                              <select
                                className={styles.teamSelect}
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                              >
                                <option value="">Select an employee to assign...</option>
                                {unassignedEmployees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.first_name} {emp.last_name}{emp.designation ? ` — ${emp.designation}` : ""}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className={styles.teamAddBtn}
                                disabled={!selectedEmployee || assigningEmployee}
                                onClick={() => handleAssignEmployee(project.id)}
                              >
                                {assigningEmployee ? "Adding..." : "Add"}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </form>
                ) : (
                  /* Project card */
                  <div
                    className={styles.projectCard}
                    onClick={() => openEdit(project)}
                  >
                    <div className={styles.projectCardLeft}>
                      <span className={styles.projectDot} style={{ background: project.color || "#8fff00" }} />
                      <div className={styles.projectCardInfo}>
                        <span className={styles.projectName}>
                          {project.name}
                          {activeProject?.id === project.id && (
                            <span style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(22, 163, 74, 0.1)",
                              color: "#16a34a",
                            }}>
                              Active
                            </span>
                          )}
                        </span>
                        {project.website_url && (
                          <span className={styles.projectUrl}>{project.website_url}</span>
                        )}
                        {project.description && (
                          <span className={styles.projectDesc}>{project.description}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className={styles.projectMeta}>
                        {project.role || "member"} &middot; {formatDate(project.created_at)}
                      </span>
                      <span className={styles.projectChevron}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

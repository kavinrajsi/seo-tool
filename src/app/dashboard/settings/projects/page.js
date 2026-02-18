"use client";

import { useState } from "react";
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
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", color: "#8fff00", website_url: "" });
  const [creating, setCreating] = useState(false);

  // Drawer
  const [drawerProject, setDrawerProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", color: "#8fff00", website_url: "" });
  const [saving, setSaving] = useState(false);

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

  function openDrawer(project) {
    setDrawerProject(project);
    setIsEditing(false);
    setEditForm({
      name: project.name || "",
      description: project.description || "",
      color: project.color || "#8fff00",
      website_url: project.website_url || "",
    });
    setError("");
    loadTeamEmployees(project.id);
  }

  function closeDrawer() {
    setDrawerProject(null);
    setIsEditing(false);
    setError("");
    setTeamEmployees([]);
    setUnassignedEmployees([]);
    setSelectedEmployee("");
  }

  function startEditing() {
    setIsEditing(true);
    setError("");
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditForm({
      name: drawerProject.name || "",
      description: drawerProject.description || "",
      color: drawerProject.color || "#8fff00",
      website_url: drawerProject.website_url || "",
    });
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!editForm.name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${drawerProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProjects();
        const updated = { ...drawerProject, ...data };
        setDrawerProject(updated);
        if (activeProject?.id === drawerProject.id) {
          setActiveProject(updated);
        }
        setIsEditing(false);
        showSuccess("Project updated");
      } else {
        setError(data.error || "Failed to update project");
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this project? This cannot be undone. All project-scoped data will lose its project association.")) return;
    setError("");
    try {
      const res = await fetch(`/api/projects/${drawerProject.id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshProjects();
        if (activeProject?.id === drawerProject.id) {
          setActiveProject(null);
        }
        closeDrawer();
        showSuccess("Project deleted");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete project");
      }
    } catch {
      setError("Network error");
    }
  }

  async function loadTeamEmployees(projectId) {
    setLoadingTeam(true);
    try {
      const [assignedRes, availableRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/employees`),
        fetch(`/api/projects/${projectId}/employees?available=true`),
      ]);
      if (assignedRes.ok) {
        const data = await assignedRes.json();
        setTeamEmployees(data.employees || []);
      }
      if (availableRes.ok) {
        const data = await availableRes.json();
        setUnassignedEmployees(data.employees || []);
      }
    } catch {
      // silent
    }
    setLoadingTeam(false);
  }

  async function handleAssignEmployee() {
    if (!selectedEmployee || assigningEmployee || !drawerProject) return;
    setAssigningEmployee(true);
    try {
      const res = await fetch(`/api/projects/${drawerProject.id}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: selectedEmployee }),
      });
      if (res.ok) {
        setSelectedEmployee("");
        await loadTeamEmployees(drawerProject.id);
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

  async function handleUnassignEmployee(employeeId) {
    if (!drawerProject) return;
    try {
      const res = await fetch(`/api/projects/${drawerProject.id}/employees?employee_id=${employeeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadTeamEmployees(drawerProject.id);
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

      {error && !drawerProject && <div className={styles.error}>{error}</div>}
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
              <div
                key={project.id}
                className={styles.projectCard}
                onClick={() => openDrawer(project)}
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
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Drawer */}
      {drawerProject && (
        <>
          <div className={styles.drawerOverlay} onClick={closeDrawer} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>
                <span className={styles.projectDot} style={{ background: drawerProject.color || "#8fff00" }} />
                {drawerProject.name}
              </div>
              <button className={styles.drawerClose} onClick={closeDrawer}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.drawerBody}>
              {error && <div className={styles.error}>{error}</div>}

              {/* Project Details / Edit Form */}
              {isEditing ? (
                <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div className={styles.drawerSectionTitle}>Edit Project</div>
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
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className={styles.saveBtn} type="submit" disabled={saving || !editForm.name.trim()}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button type="button" className={styles.cancelBtn} onClick={cancelEditing}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className={styles.drawerSectionTitle}>Project Details</div>
                  <div className={styles.drawerInfoRow}>
                    <span className={styles.drawerInfoLabel}>Name</span>
                    <span className={styles.drawerInfoValue}>{drawerProject.name}</span>
                  </div>
                  {drawerProject.website_url && (
                    <div className={styles.drawerInfoRow}>
                      <span className={styles.drawerInfoLabel}>Website</span>
                      <span className={styles.drawerInfoValue} style={{ color: "#3b82f6" }}>{drawerProject.website_url}</span>
                    </div>
                  )}
                  {drawerProject.description && (
                    <div className={styles.drawerInfoRow}>
                      <span className={styles.drawerInfoLabel}>Description</span>
                      <span className={styles.drawerInfoValue} style={{ fontWeight: 400 }}>{drawerProject.description}</span>
                    </div>
                  )}
                  <div className={styles.drawerInfoRow}>
                    <span className={styles.drawerInfoLabel}>Your Role</span>
                    <span className={styles.drawerInfoValue} style={{ textTransform: "capitalize" }}>{drawerProject.role || "member"}</span>
                  </div>
                  <div className={styles.drawerInfoRow}>
                    <span className={styles.drawerInfoLabel}>Created</span>
                    <span className={styles.drawerInfoValue}>{formatDate(drawerProject.created_at)}</span>
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div className={styles.teamSection} style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                <div className={styles.drawerSectionTitle}>Team Members ({teamEmployees.length})</div>
                {loadingTeam ? (
                  <div className={styles.teamEmpty}>Loading team members...</div>
                ) : (
                  <>
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
                          onClick={handleAssignEmployee}
                        >
                          {assigningEmployee ? "Adding..." : "Add"}
                        </button>
                      </div>
                    )}

                    {teamEmployees.length > 0 ? (
                      <div className={styles.teamMemberList}>
                        {teamEmployees.map((emp) => (
                          <div key={emp.id} className={styles.teamMemberRow}>
                            <div className={styles.teamMemberInfo}>
                              <span className={styles.teamMemberName}>
                                {emp.first_name} {emp.last_name}
                              </span>
                              <span className={styles.teamMemberMeta}>
                                {emp.designation || "No designation"} {emp.work_email ? `· ${emp.work_email}` : ""}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() => handleUnassignEmployee(emp.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.teamEmpty}>No active employees assigned to this project yet.</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <button
                className={styles.dangerBtn}
                type="button"
                onClick={handleDelete}
              >
                Delete Project
              </button>
              <div className={styles.drawerFooterRight}>
                {!isEditing && (
                  <button className={styles.saveBtn} type="button" onClick={startEditing}>
                    Edit Project
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

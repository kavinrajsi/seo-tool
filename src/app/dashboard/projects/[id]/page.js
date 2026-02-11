"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./page.module.css";

const COLOR_OPTIONS = ["#8fff00", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function ProjectDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { refreshProjects } = useProject();
  const [project, setProject] = useState(null);
  const [role, setRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("#8fff00");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [projRes, membersRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/members`),
        ]);
        if (projRes.ok) {
          const json = await projRes.json();
          setProject(json.project);
          setRole(json.role);
          setEditName(json.project.name);
          setEditDesc(json.project.description || "");
          setEditColor(json.project.color || "#8fff00");
          setEditWebsiteUrl(json.project.website_url || "");
        }
        if (membersRes.ok) {
          const json = await membersRes.json();
          setMembers(json.members || []);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const isAdmin = role === "owner" || role === "admin";

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDesc.trim() || null,
        color: editColor,
        websiteUrl: editWebsiteUrl.trim() || null,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setProject(json.project);
      await refreshProjects();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this project? All data will become unassigned (not deleted).")) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      await refreshProjects();
      router.push("/dashboard/projects");
    }
    setDeleting(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteError("");
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch(`/api/projects/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    if (res.ok) {
      setInviteEmail("");
      // Refresh members
      const membersRes = await fetch(`/api/projects/${id}/members`);
      if (membersRes.ok) {
        const json = await membersRes.json();
        setMembers(json.members || []);
      }
    } else {
      const json = await res.json();
      setInviteError(json.error || "Failed to add member");
    }
    setInviting(false);
  }

  async function handleRemoveMember(memberId) {
    if (!confirm("Remove this member's project-level role override?")) return;
    const res = await fetch(`/api/projects/${id}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) {
      const membersRes = await fetch(`/api/projects/${id}/members`);
      if (membersRes.ok) {
        const json = await membersRes.json();
        setMembers(json.members || []);
      }
    }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!project) return <div className={styles.loading}>Project not found</div>;

  return (
    <>
      <h1 className={styles.heading}>
        <span className={styles.dot} style={{ background: project.color || "#8fff00" }} />
        {project.name}
      </h1>
      {project.teams?.name && (
        <p className={styles.teamLabel}>Team: {project.teams.name}</p>
      )}

      {isAdmin && (
        <form className={styles.form} onSubmit={handleSave}>
          <h2 className={styles.sectionTitle}>Settings</h2>
          <div className={styles.nameUrlRow}>
            <input
              className={styles.input}
              type="text"
              placeholder="Project name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <input
              className={styles.input}
              type="url"
              placeholder="Website URL (optional)"
              value={editWebsiteUrl}
              onChange={(e) => setEditWebsiteUrl(e.target.value)}
            />
          </div>
          <input
            className={styles.input}
            type="text"
            placeholder="Description (optional)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>Color</span>
            <div className={styles.colorOptions}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorSwatch} ${editColor === c ? styles.colorSwatchActive : ""}`}
                  style={{ background: c }}
                  onClick={() => setEditColor(c)}
                />
              ))}
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.saveBtn} type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {role === "owner" && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Project"}
              </button>
            )}
          </div>
        </form>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Members</h2>

        {isAdmin && (
          <form className={styles.inviteRow} onSubmit={handleInvite}>
            <input
              className={styles.input}
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <select
              className={styles.roleSelect}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button className={styles.inviteBtn} type="submit" disabled={inviting}>
              {inviting ? "Adding..." : "Add Member"}
            </button>
          </form>
        )}
        {inviteError && <p className={styles.error}>{inviteError}</p>}

        <div className={styles.memberList}>
          {members.map((m) => (
            <div key={m.userId} className={styles.memberRow}>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{m.name || m.email || m.userId}</span>
                <span className={styles.memberEmail}>{m.email}</span>
              </div>
              <div className={styles.memberRoles}>
                <span className={styles.roleBadge}>{m.effectiveRole}</span>
                {m.source === "team" && <span className={styles.sourceBadge}>team</span>}
                {m.source === "project" && <span className={styles.sourceBadge}>override</span>}
                {m.source === "both" && <span className={styles.sourceBadge}>override</span>}
              </div>
              {isAdmin && m.projectMemberId && !m.isOwner && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemoveMember(m.projectMemberId)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

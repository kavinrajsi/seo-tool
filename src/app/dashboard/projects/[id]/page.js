"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import { useProject } from "@/app/components/ProjectProvider";
import {
  ROLE_LABELS,
  getRoleLevel,
  canInviteToProject,
} from "@/lib/permissions";
import styles from "./page.module.css";

const PRESET_COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
const ASSIGNABLE_ROLES = ["viewer", "editor", "admin"];

export default function ProjectDetailPage({ params }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { refreshProjects } = useProject();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchProject() {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
      setMyRole(data.role);
      setEditName(data.name || "");
      setEditDesc(data.description || "");
      setEditColor(data.color || PRESET_COLORS[0]);
      setEditWebsite(data.website_url || "");
    }
  }

  async function fetchMembers() {
    const res = await fetch(`/api/projects/${id}/members`);
    if (res.ok) {
      const json = await res.json();
      setMembers(json.members || []);
    }
  }

  useEffect(() => {
    Promise.all([fetchProject(), fetchMembers()]).then(() => setLoading(false));
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDesc,
        color: editColor,
        website_url: editWebsite,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Failed to update");
    } else {
      setSuccess("Project updated");
      fetchProject();
      refreshProjects();
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setError("");
    setSuccess("");
    setInviting(true);

    const res = await fetch(`/api/projects/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Failed to add member");
    } else {
      setSuccess(`Member added: ${inviteEmail.trim()}`);
      setInviteEmail("");
      setInviteRole("viewer");
      fetchMembers();
    }

    setInviting(false);
  }

  async function handleRoleChange(memberId, newRole) {
    setError("");
    const res = await fetch(`/api/projects/${id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Failed to change role");
    } else {
      fetchMembers();
    }
  }

  async function handleRemove(memberId, memberName) {
    if (!confirm(`Remove ${memberName || "this member"} from the project?`)) return;
    setError("");

    const res = await fetch(`/api/projects/${id}/members/${memberId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Failed to remove member");
    } else {
      fetchMembers();
    }
  }

  if (loading) {
    return <p className={styles.loading}>Loading project...</p>;
  }

  if (!project) {
    return (
      <>
        <Link href="/dashboard/projects" className={styles.backLink}>
          &larr; Back to projects
        </Link>
        <div className={styles.error}>Project not found</div>
      </>
    );
  }

  const canEdit = myRole === "owner" || myRole === "admin";
  const showInvite = canInviteToProject(myRole);

  return (
    <>
      <Link href="/dashboard/projects" className={styles.backLink}>
        &larr; Back to projects
      </Link>

      <h1 className={styles.heading}>
        <span className={styles.colorIndicator} style={{ background: project.color || "#16a34a" }} />
        {project.name}
        <span className={styles.memberCount}>{members.length} member{members.length !== 1 ? "s" : ""}</span>
      </h1>
      <p className={styles.subheading}>
        Your role: {ROLE_LABELS[myRole] || myRole}
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {canEdit && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Project Details</h2>
          <form onSubmit={handleSave}>
            <div className={styles.formRow}>
              <input
                className={styles.input}
                type="text"
                placeholder="Project name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <input
                className={styles.input}
                type="url"
                placeholder="Website URL (optional)"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <input
                className={styles.input}
                type="text"
                placeholder="Description (optional)"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
              <div className={styles.colorPicker}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.colorDot} ${editColor === c ? styles.colorDotActive : ""}`}
                    style={{ background: c }}
                    onClick={() => setEditColor(c)}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
              <button className={styles.saveBtn} type="submit" disabled={saving || !editName.trim()}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showInvite && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Member</h2>
          <form className={styles.inviteRow} onSubmit={handleInvite}>
            <input
              className={styles.input}
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className={styles.roleSelect}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button
              className={styles.inviteBtn}
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? "Adding..." : "Add"}
            </button>
          </form>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Members</h2>

        <div className={styles.memberList}>
          {members.map((member) => {
            const isMe = member.user_id === user?.id;
            const showRoleChange =
              !isMe &&
              member.role !== "owner" &&
              getRoleLevel(myRole) >= 3 &&
              getRoleLevel(myRole) > getRoleLevel(member.role);
            const showRemove =
              !isMe &&
              member.role !== "owner" &&
              getRoleLevel(myRole) >= 3 &&
              getRoleLevel(myRole) > getRoleLevel(member.role);

            return (
              <div key={member.id} className={styles.memberRow}>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {member.name || "Unnamed"}
                    {isMe && <span className={styles.youTag}>(you)</span>}
                  </span>
                  <span className={styles.memberEmail}>{member.email}</span>
                </div>
                <div className={styles.memberActions}>
                  {showRoleChange ? (
                    <select
                      className={styles.roleSelect}
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    >
                      {ASSIGNABLE_ROLES
                        .filter((r) => getRoleLevel(r) < getRoleLevel(myRole))
                        .map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                    </select>
                  ) : (
                    <span className={`${styles.roleBadge} ${styles[`role${member.role.charAt(0).toUpperCase() + member.role.slice(1)}`]}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  )}
                  {showRemove && (
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemove(member.id, member.name)}
                      title="Remove member"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

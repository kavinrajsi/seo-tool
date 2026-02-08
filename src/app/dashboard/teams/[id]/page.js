"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import {
  ROLE_LABELS,
  getRoleLevel,
  canInvite,
  canRemoveMember,
  canChangeRole,
} from "@/lib/permissions";
import styles from "./page.module.css";

const ASSIGNABLE_ROLES = ["viewer", "editor", "admin"];

export default function TeamDetailPage({ params }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchTeam() {
    const res = await fetch("/api/teams");
    if (res.ok) {
      const json = await res.json();
      const found = json.teams?.find((t) => t.id === id);
      if (found) setTeam(found);
    }
  }

  async function fetchMembers() {
    const res = await fetch(`/api/teams/${id}/members`);
    if (res.ok) {
      const json = await res.json();
      setMembers(json.members || []);
      const me = json.members?.find((m) => m.user_id === user?.id);
      if (me) setMyRole(me.role);
    }
  }

  useEffect(() => {
    Promise.all([fetchTeam(), fetchMembers()]).then(() => setLoading(false));
  }, [id]);

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setError("");
    setSuccess("");
    setInviting(true);

    const res = await fetch(`/api/teams/${id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Failed to invite");
    } else {
      setSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      setInviteRole("viewer");
      fetchMembers();
    }

    setInviting(false);
  }

  async function handleRoleChange(memberId, newRole) {
    setError("");
    const res = await fetch(`/api/teams/${id}/members/${memberId}/role`, {
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
    if (!confirm(`Remove ${memberName || "this member"} from the team?`)) return;
    setError("");

    const res = await fetch(`/api/teams/${id}/members/${memberId}`, {
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
    return <p className={styles.loading}>Loading team...</p>;
  }

  if (!team) {
    return (
      <>
        <Link href="/dashboard/teams" className={styles.backLink}>
          &larr; Back to teams
        </Link>
        <div className={styles.error}>Team not found</div>
      </>
    );
  }

  const showInvite = canInvite(myRole);

  return (
    <>
      <Link href="/dashboard/teams" className={styles.backLink}>
        &larr; Back to teams
      </Link>

      <h1 className={styles.heading}>
        {team.name}
        <span className={styles.memberCount}>{members.length} member{members.length !== 1 ? "s" : ""}</span>
      </h1>
      <p className={styles.subheading}>
        Your role: {ROLE_LABELS[myRole] || myRole}
      </p>

      {showInvite && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Invite Member</h2>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

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
              {inviting ? "Inviting..." : "Invite"}
            </button>
          </form>
        </div>
      )}

      {!showInvite && error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Members</h2>

        <div className={styles.memberList}>
          {members.map((member) => {
            const isMe = member.user_id === user?.id;
            const showRoleChange =
              !isMe &&
              member.role !== "owner" &&
              canChangeRole(myRole, member.role, member.role);
            const showRemove =
              !isMe &&
              member.role !== "owner" &&
              canRemoveMember(myRole, member.role);

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

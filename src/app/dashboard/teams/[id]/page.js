"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import styles from "./page.module.css";

export default function TeamDetailPage({ params }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
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
    setLoading(false);
  }

  async function fetchMembers() {
    // Members are fetched via the team_members table
    // For simplicity, we fetch them through a dedicated endpoint pattern
    // Since we don't have a dedicated members list endpoint, we'll use the team data
    // This is a simplified approach
  }

  useEffect(() => {
    fetchTeam();
  }, [id]);

  const isOwner = team?.owner_id === user?.id;

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setError("");
    setSuccess("");
    setInviting(true);

    const res = await fetch(`/api/teams/${id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Failed to invite");
    } else {
      setSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
    }

    setInviting(false);
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

  return (
    <>
      <Link href="/dashboard/teams" className={styles.backLink}>
        &larr; Back to teams
      </Link>

      <h1 className={styles.heading}>{team.name}</h1>
      <p className={styles.subheading}>
        Your role: {isOwner ? "Owner" : "Member"}
      </p>

      {isOwner && (
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
    </>
  );
}

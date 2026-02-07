"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function fetchTeams() {
    const res = await fetch("/api/teams");
    if (res.ok) {
      const json = await res.json();
      setTeams(json.teams || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTeams();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      fetchTeams();
    }
    setCreating(false);
  }

  return (
    <>
      <h1 className={styles.heading}>Teams</h1>

      <form className={styles.createRow} onSubmit={handleCreate}>
        <input
          className={styles.input}
          type="text"
          placeholder="New team name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className={styles.createBtn} type="submit" disabled={creating || !newName.trim()}>
          {creating ? "Creating..." : "Create Team"}
        </button>
      </form>

      {loading && (
        <>
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          <div className={styles.grid}>
            {[1,2,3].map(i => (
              <div key={i} className={styles.card} style={{ pointerEvents: "none" }}>
                <div className={styles.cardInfo}>
                  <div style={{ width: "60%", height: "16px", background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "6px", marginBottom: "0.5rem" }} />
                  <div style={{ width: "30%", height: "12px", background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "6px" }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && teams.length === 0 && (
        <div className={styles.empty}>No teams yet. Create one above.</div>
      )}

      <div className={styles.grid}>
        {teams.map((team) => (
          <Link key={team.id} href={`/dashboard/teams/${team.id}`} className={styles.card}>
            <div className={styles.cardInfo}>
              <span className={styles.teamName}>{team.name}</span>
              <span className={styles.teamRole}>{team.role}</span>
            </div>
            <span className={styles.chevron}>&#8250;</span>
          </Link>
        ))}
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./page.module.css";

const COLOR_OPTIONS = ["#8fff00", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function ProjectsPage() {
  const { projects, refreshProjects } = useProject();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newColor, setNewColor] = useState("#8fff00");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/teams");
        if (res.ok) {
          const json = await res.json();
          setTeams(json.teams || []);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        teamId: newTeamId || undefined,
        color: newColor,
        websiteUrl: newWebsiteUrl.trim() || undefined,
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewDescription("");
      setNewTeamId("");
      setNewColor("#8fff00");
      setNewWebsiteUrl("");
      setShowForm(false);
      await refreshProjects();
    }
    setCreating(false);
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.heading}>Projects</h1>
        <button
          type="button"
          className={styles.newBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              type="text"
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              type="text"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              type="url"
              placeholder="Website URL (optional)"
              value={newWebsiteUrl}
              onChange={(e) => setNewWebsiteUrl(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <select
              className={styles.select}
              value={newTeamId}
              onChange={(e) => setNewTeamId(e.target.value)}
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <label className={styles.colorLabel}>Color</label>
            <div className={styles.colorOptions}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorSwatch} ${newColor === c ? styles.colorSwatchActive : ""}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
          </div>
          <button className={styles.createBtn} type="submit" disabled={creating || !newName.trim()}>
            {creating ? "Creating..." : "Create Project"}
          </button>
        </form>
      )}

      {loading && (
        <div className={styles.empty}>Loading...</div>
      )}

      {!loading && projects.length === 0 && !showForm && (
        <div className={styles.empty}>No projects yet. Create one to organize your data.</div>
      )}

      <div className={styles.grid}>
        {projects.map((project) => (
          <Link key={project.id} href={`/dashboard/projects/${project.id}`} className={styles.card}>
            <div className={styles.cardLeft}>
              <span className={styles.dot} style={{ background: project.color || "#8fff00" }} />
              <div className={styles.cardInfo}>
                <span className={styles.projectName}>{project.name}</span>
                {project.description && (
                  <span className={styles.projectDesc}>{project.description}</span>
                )}
                {project.website_url && (
                  <span className={styles.projectUrl}>{project.website_url}</span>
                )}
                <span className={styles.projectMeta}>
                  {project.teams?.name || "No team"}
                </span>
              </div>
            </div>
            <span className={styles.chevron}>&#8250;</span>
          </Link>
        ))}
      </div>
    </>
  );
}

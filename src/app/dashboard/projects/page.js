"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./page.module.css";

const PRESET_COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export default function ProjectsPage() {
  const { refreshProjects } = useProject();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newWebsite, setNewWebsite] = useState("");
  const [creating, setCreating] = useState(false);

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const json = await res.json();
      setProjects(json.projects || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
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
        description: newDescription.trim() || null,
        color: newColor,
        website_url: newWebsite.trim() || null,
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewDescription("");
      setNewColor(PRESET_COLORS[0]);
      setNewWebsite("");
      fetchProjects();
      refreshProjects();
    }
    setCreating(false);
  }

  return (
    <>
      <h1 className={styles.heading}>Projects</h1>

      <form className={styles.createForm} onSubmit={handleCreate}>
        <div className={styles.createRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className={styles.input}
            type="url"
            placeholder="Website URL (optional)"
            value={newWebsite}
            onChange={(e) => setNewWebsite(e.target.value)}
          />
        </div>
        <div className={styles.createRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className={styles.colorPicker}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorDot} ${newColor === c ? styles.colorDotActive : ""}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <button className={styles.createBtn} type="submit" disabled={creating || !newName.trim()}>
            {creating ? "Creating..." : "Create Project"}
          </button>
        </div>
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

      {!loading && projects.length === 0 && (
        <div className={styles.empty}>No projects yet. Create one above.</div>
      )}

      <div className={styles.grid}>
        {projects.map((project) => (
          <Link key={project.id} href={`/dashboard/projects/${project.id}`} className={styles.card}>
            <div className={styles.cardLeft}>
              <span className={styles.colorIndicator} style={{ background: project.color || "#16a34a" }} />
              <div className={styles.cardInfo}>
                <span className={styles.projectName}>{project.name}</span>
                {project.description && (
                  <span className={styles.projectDesc}>{project.description}</span>
                )}
                <span className={styles.projectRole}>{project.role}</span>
              </div>
            </div>
            <span className={styles.chevron}>&#8250;</span>
          </Link>
        ))}
      </div>
    </>
  );
}

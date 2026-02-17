"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./ProjectSelector.module.css";

export default function ProjectSelector() {
  const { projects, activeProject, setActiveProject, refreshProjects, loading } = useProject();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        await refreshProjects();
        setActiveProject(project);
        setNewName("");
        setShowCreate(false);
        setOpen(false);
      }
    } catch {
      // Ignore
    }
    setCreating(false);
  }

  if (loading) return null;

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {activeProject ? (
          <>
            <span className={styles.dot} style={{ background: activeProject.color || "#8fff00" }} />
            <span className={styles.triggerName}>{activeProject.name}</span>
          </>
        ) : (
          <span className={styles.triggerName}>No project selected</span>
        )}
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {projects.length === 0 ? (
            <div className={styles.noBanner}>
              No projects yet.{" "}
              <button
                className={styles.noBannerLink}
                onClick={() => setShowCreate(true)}
                type="button"
              >
                Create one
              </button>
            </div>
          ) : (
            <div className={styles.projectList}>
              {projects.map((p) => (
                <button
                  key={p.id}
                  className={`${styles.projectItem} ${
                    activeProject?.id === p.id ? styles.projectItemActive : ""
                  }`}
                  onClick={() => {
                    setActiveProject(p);
                    setOpen(false);
                  }}
                  type="button"
                >
                  <span className={styles.dot} style={{ background: p.color || "#8fff00" }} />
                  {p.name}
                </button>
              ))}
            </div>
          )}

          <div className={styles.divider} />

          {showCreate ? (
            <form className={styles.createForm} onSubmit={handleCreate}>
              <input
                className={styles.createInput}
                placeholder="Project name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <button className={styles.createBtn} type="submit" disabled={creating || !newName.trim()}>
                {creating ? "..." : "Create"}
              </button>
            </form>
          ) : (
            <>
              <button
                className={styles.actionItem}
                onClick={() => setShowCreate(true)}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Project
              </button>
              <button
                className={styles.actionItem}
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard/settings/projects");
                }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Manage Projects
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

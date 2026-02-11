"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./ProjectSelector.module.css";

export default function ProjectSelector() {
  const { projects, activeProject, setActiveProject, loading } = useProject();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeLabel = activeProject === "all"
    ? "All Projects"
    : projects.find((p) => p.id === activeProject)?.name || "Personal";

  const activeColor = activeProject === "all"
    ? "#6b7280"
    : projects.find((p) => p.id === activeProject)?.color || null;

  if (loading) return null;

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(!open)}
      >
        {activeColor && (
          <span className={styles.dot} style={{ background: activeColor }} />
        )}
        <span className={styles.label}>{activeLabel}</span>
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
          <button
            type="button"
            className={`${styles.option} ${!activeProject ? styles.optionActive : ""}`}
            onClick={() => { setActiveProject(null); setOpen(false); }}
          >
            <span className={styles.optionLabel}>Personal</span>
          </button>
          <button
            type="button"
            className={`${styles.option} ${activeProject === "all" ? styles.optionActive : ""}`}
            onClick={() => { setActiveProject("all"); setOpen(false); }}
          >
            <span className={styles.optionLabel}>All Projects</span>
          </button>

          {projects.length > 0 && <div className={styles.divider} />}

          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`${styles.option} ${activeProject === project.id ? styles.optionActive : ""}`}
              onClick={() => { setActiveProject(project.id); setOpen(false); }}
            >
              <span className={styles.dot} style={{ background: project.color || "#8fff00" }} />
              <span className={styles.optionLabel}>{project.name}</span>
              {project.teams?.name && (
                <span className={styles.teamBadge}>{project.teams.name}</span>
              )}
            </button>
          ))}

          <div className={styles.divider} />
          <Link
            href="/dashboard/projects"
            className={styles.manageLink}
            onClick={() => setOpen(false)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Manage Projects
          </Link>
        </div>
      )}
    </div>
  );
}

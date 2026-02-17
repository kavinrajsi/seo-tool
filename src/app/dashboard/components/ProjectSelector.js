"use client";

import { useProject } from "@/app/components/ProjectProvider";
import styles from "./ProjectSelector.module.css";

export default function ProjectSelector() {
  const { projects, activeProject, setActiveProject, loading } = useProject();

  if (loading || projects.length === 0) return null;

  function handleChange(e) {
    const val = e.target.value;
    if (!val) {
      setActiveProject(null);
    } else {
      const found = projects.find((p) => p.id === val);
      setActiveProject(found || null);
    }
  }

  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={activeProject?.id || ""}
        onChange={handleChange}
      >
        <option value="">All Projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

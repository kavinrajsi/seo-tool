"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

const ProjectContext = createContext({
  projects: [],
  activeProject: null,
  setActiveProject: () => {},
  refreshProjects: async () => {},
  loading: true,
});

export function useProject() {
  return useContext(ProjectContext);
}

export default function ProjectProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProjectState] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const json = await res.json();
        return json.projects || [];
      }
    } catch {
      // Failed to fetch
    }
    return [];
  }

  async function refreshProjects() {
    const list = await fetchProjects();
    setProjects(list);
    return list;
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProjects([]);
      setActiveProjectState(null);
      setLoading(false);
      return;
    }

    async function init() {
      const list = await fetchProjects();
      setProjects(list);

      // Restore saved project from localStorage
      const key = `firefly_active_project_${user.id}`;
      const savedId = localStorage.getItem(key);
      if (savedId) {
        const found = list.find((p) => p.id === savedId);
        if (found) {
          setActiveProjectState(found);
        } else {
          localStorage.removeItem(key);
        }
      }

      setLoading(false);
    }

    init();
  }, [user, authLoading]);

  function setActiveProject(project) {
    setActiveProjectState(project);
    if (user) {
      const key = `firefly_active_project_${user.id}`;
      if (project) {
        localStorage.setItem(key, project.id);
      } else {
        localStorage.removeItem(key);
      }
    }
  }

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProject, refreshProjects, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

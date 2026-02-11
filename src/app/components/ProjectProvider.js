"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

function getStorageKey(userId) {
  return `activeProject_${userId}`;
}

export default function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProjectState] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const json = await res.json();
        setProjects(json.projects || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load projects when user changes
  useEffect(() => {
    if (user) {
      refreshProjects();
    } else {
      setProjects([]);
      setActiveProjectState(null);
      setLoading(false);
    }
  }, [user, refreshProjects]);

  // Restore active project from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(getStorageKey(user.id));
      if (stored) {
        // "all" or a project ID
        setActiveProjectState(stored);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const setActiveProject = useCallback((projectId) => {
    setActiveProjectState(projectId);
    if (user) {
      try {
        if (projectId) {
          localStorage.setItem(getStorageKey(user.id), projectId);
        } else {
          localStorage.removeItem(getStorageKey(user.id));
        }
      } catch {
        // ignore
      }
    }
  }, [user]);

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProject, refreshProjects, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

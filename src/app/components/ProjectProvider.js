"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

const ProjectContext = createContext({
  projects: [],
  activeProject: null,
  activeProjectId: null,
  setActiveProject: () => {},
  refreshProjects: async () => {},
  loading: true,
});

export function useProject() {
  return useContext(ProjectContext);
}

export default function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProjectState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        if (active) {
          setProjects([]);
          setActiveProjectState(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/projects");
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          const fetchedProjects = data.projects || [];
          setProjects(fetchedProjects);

          // Restore active project from localStorage
          const savedId = localStorage.getItem("activeProjectId");
          if (savedId) {
            const found = fetchedProjects.find((p) => p.id === savedId);
            if (found) {
              setActiveProjectState(found);
            } else if (fetchedProjects.length > 0) {
              setActiveProjectState(fetchedProjects[0]);
              localStorage.setItem("activeProjectId", fetchedProjects[0].id);
            } else {
              setActiveProjectState(null);
              localStorage.removeItem("activeProjectId");
            }
          } else if (fetchedProjects.length > 0) {
            setActiveProjectState(fetchedProjects[0]);
            localStorage.setItem("activeProjectId", fetchedProjects[0].id);
          }
        }
      } catch {
        // Ignore fetch errors
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  async function refreshProjects() {
    if (!user) {
      setProjects([]);
      setActiveProjectState(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const fetchedProjects = data.projects || [];
        setProjects(fetchedProjects);

        const savedId = localStorage.getItem("activeProjectId");
        if (savedId) {
          const found = fetchedProjects.find((p) => p.id === savedId);
          if (found) {
            setActiveProjectState(found);
          } else if (fetchedProjects.length > 0) {
            setActiveProjectState(fetchedProjects[0]);
            localStorage.setItem("activeProjectId", fetchedProjects[0].id);
          } else {
            setActiveProjectState(null);
            localStorage.removeItem("activeProjectId");
          }
        } else if (fetchedProjects.length > 0) {
          setActiveProjectState(fetchedProjects[0]);
          localStorage.setItem("activeProjectId", fetchedProjects[0].id);
        }
      }
    } catch {
      // Ignore fetch errors
    }
    setLoading(false);
  }

  function setActiveProject(project) {
    setActiveProjectState(project);
    if (project) {
      localStorage.setItem("activeProjectId", project.id);
    } else {
      localStorage.removeItem("activeProjectId");
    }
  }

  const activeProjectId = activeProject?.id || null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        setActiveProject,
        refreshProjects,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

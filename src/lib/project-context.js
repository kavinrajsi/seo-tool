"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const projectList = data || [];
    setProjects(projectList);

    const savedId = typeof window !== "undefined"
      ? localStorage.getItem("activeProjectId")
      : null;
    const saved = projectList.find((p) => p.id === savedId);
    setActiveProject(saved || null);
    setLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const switchProject = useCallback((projectId) => {
    if (!projectId) {
      setActiveProject(null);
      localStorage.removeItem("activeProjectId");
    } else {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setActiveProject(project);
        localStorage.setItem("activeProjectId", projectId);
      }
    }
  }, [projects]);

  return (
    <ProjectContext.Provider value={{
      activeProject,
      projects,
      switchProject,
      loading,
      refreshProjects: loadProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    return { activeProject: null, projects: [], switchProject: () => {}, loading: true, refreshProjects: () => {} };
  }
  return ctx;
}

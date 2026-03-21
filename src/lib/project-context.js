"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { activeTeam } = useTeam();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let query = supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", user.id).is("team_id", null);
    }

    const { data } = await query;
    const projectList = data || [];
    setProjects(projectList);

    // Restore last active project from localStorage
    const savedId = typeof window !== "undefined"
      ? localStorage.getItem("activeProjectId")
      : null;
    const saved = projectList.find((p) => p.id === savedId);
    if (saved) {
      setActiveProject(saved);
    } else {
      setActiveProject(null);
    }
    setLoading(false);
  }, [activeTeam]);

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

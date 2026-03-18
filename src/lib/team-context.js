"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const [userTeams, setUserTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTeams = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, role, teams(id, name)")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      const teams = memberships.map((m) => ({
        id: m.teams.id,
        name: m.teams.name,
        role: m.role,
      }));
      setUserTeams(teams);

      // Restore last active team from localStorage
      const savedTeamId = typeof window !== "undefined"
        ? localStorage.getItem("activeTeamId")
        : null;
      const savedTeam = teams.find((t) => t.id === savedTeamId);
      if (savedTeam) {
        setActiveTeam(savedTeam);
        setUserRole(savedTeam.role);
      }
    } else {
      setUserTeams([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const switchTeam = useCallback((teamId) => {
    if (!teamId) {
      setActiveTeam(null);
      setUserRole(null);
      localStorage.removeItem("activeTeamId");
    } else {
      const team = userTeams.find((t) => t.id === teamId);
      if (team) {
        setActiveTeam(team);
        setUserRole(team.role);
        localStorage.setItem("activeTeamId", teamId);
      }
    }
  }, [userTeams]);

  return (
    <TeamContext.Provider value={{
      activeTeam,
      userRole,
      userTeams,
      switchTeam,
      loading,
      refreshTeams: loadTeams,
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    // Return safe defaults when used outside provider (e.g., during SSR)
    return { activeTeam: null, userRole: null, userTeams: [], switchTeam: () => {}, loading: true, refreshTeams: () => {} };
  }
  return ctx;
}

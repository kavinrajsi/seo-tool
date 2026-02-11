import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveProjectRole } from "@/lib/permissions";

/**
 * Get the user's effective role for a project.
 * Checks: project ownership, project_members override, team_members fallback.
 * Returns role string or null if no access.
 */
export async function getUserProjectRole(userId, projectId) {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("owner_id, team_id")
    .eq("id", projectId)
    .single();

  if (!project) return null;

  // Project owner always gets owner role
  if (project.owner_id === userId) return "owner";

  // Check direct project membership
  const { data: projectMember } = await admin
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  // Check team membership if project belongs to a team
  let teamRole = null;
  if (project.team_id) {
    const { data: teamMember } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", project.team_id)
      .eq("user_id", userId)
      .single();
    teamRole = teamMember?.role || null;
  }

  const effectiveRole = getEffectiveProjectRole(teamRole, projectMember?.role || null);
  return effectiveRole;
}

/**
 * Get all project IDs the user can access:
 * - Projects they own
 * - Projects they are direct members of
 * - Projects belonging to teams they are members of
 */
export async function getAccessibleProjectIds(userId) {
  const admin = createAdminClient();

  // Owned projects
  const { data: owned } = await admin
    .from("projects")
    .select("id")
    .eq("owner_id", userId);

  // Direct project memberships
  const { data: directMember } = await admin
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);

  // Team-based access: get user's teams, then projects in those teams
  const { data: teamMemberships } = await admin
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);

  let teamProjectIds = [];
  if (teamMemberships && teamMemberships.length > 0) {
    const teamIds = teamMemberships.map((tm) => tm.team_id);
    const { data: teamProjects } = await admin
      .from("projects")
      .select("id")
      .in("team_id", teamIds);
    teamProjectIds = (teamProjects || []).map((p) => p.id);
  }

  const ids = new Set([
    ...(owned || []).map((p) => p.id),
    ...(directMember || []).map((pm) => pm.project_id),
    ...teamProjectIds,
  ]);

  return [...ids];
}

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
};

export const ROLE_LEVELS = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export function getRoleLevel(role) {
  return ROLE_LEVELS[role] || 0;
}

export function canInvite(role) {
  return getRoleLevel(role) >= 3;
}

export function canRemoveMember(actorRole, targetRole) {
  const actorLevel = getRoleLevel(actorRole);
  return actorLevel >= 3 && actorLevel > getRoleLevel(targetRole);
}

export function canChangeRole(actorRole, targetRole, newRole) {
  const actorLevel = getRoleLevel(actorRole);
  return (
    actorLevel >= 3 &&
    actorLevel > getRoleLevel(targetRole) &&
    getRoleLevel(newRole) < actorLevel
  );
}

export function canDeleteReports(role) {
  return getRoleLevel(role) >= 2;
}

export function canRunScans(role) {
  return getRoleLevel(role) >= 2;
}

export function canManageTeam(role) {
  return role === ROLES.OWNER;
}

// Project permissions

export function getEffectiveProjectRole(teamRole, projectRole) {
  if (projectRole) return projectRole;
  return teamRole || null;
}

export function canCreateProject(teamRole) {
  // Anyone can create projects without a team (teamRole = null)
  // Editor+ can create team projects
  if (!teamRole) return true;
  return getRoleLevel(teamRole) >= ROLE_LEVELS.editor;
}

export function canManageProject(role) {
  return getRoleLevel(role) >= ROLE_LEVELS.admin;
}

export function canEditProjectData(role) {
  return getRoleLevel(role) >= ROLE_LEVELS.editor;
}

export function canDeleteProjectData(role) {
  return getRoleLevel(role) >= ROLE_LEVELS.editor;
}

export function canInviteToProject(role) {
  return getRoleLevel(role) >= ROLE_LEVELS.admin;
}

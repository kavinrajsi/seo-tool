"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import {
  UsersIcon,
  PlusIcon,
  MailIcon,
  ShieldIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  CrownIcon,
  EyeIcon,
  UserIcon,
} from "lucide-react";

const ROLE_LABELS = {
  admin: { label: "Admin", icon: CrownIcon, color: "text-yellow-400 bg-yellow-500/10" },
  member: { label: "Member", icon: UserIcon, color: "text-blue-400 bg-blue-500/10" },
  viewer: { label: "Viewer", icon: EyeIcon, color: "text-zinc-400 bg-zinc-500/10" },
};

function RoleBadge({ role }) {
  const config = ROLE_LABELS[role] || ROLE_LABELS.member;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const { activeTeam, userTeams, switchTeam, refreshTeams } = useTeam();
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create team form
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  // Edit team name
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/signin");
      else setUser(data.user);
    });
  }, [router]);

  const loadMembers = useCallback(async () => {
    if (!activeTeam) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/team/members?teamId=${activeTeam.id}`);
      const data = await res.json();
      if (res.ok) {
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
        setMyRole(data.userRole);
      }
    } catch { /* */ }
    setLoading(false);
  }, [activeTeam]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewTeamName("");
      setShowCreate(false);
      await refreshTeams();
      switchTeam(data.team.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam) return;
    setInviting(true);
    setError("");
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeam.id, email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteEmail("");
      loadMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(memberId, newRole) {
    setError("");
    try {
      const res = await fetch("/api/team/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeam.id, memberId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveMember(memberId) {
    setError("");
    try {
      const res = await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeam.id, memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancelInvitation(invitationId) {
    setError("");
    try {
      const res = await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeam.id, invitationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadMembers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateTeamName() {
    if (!editName.trim()) return;
    setError("");
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeam.id, name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditing(false);
      await refreshTeams();
      switchTeam(activeTeam.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTeam() {
    if (!confirm("Are you sure you want to delete this team? All team data sharing will be lost.")) return;
    setError("");
    try {
      const res = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeam.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      switchTeam(null);
      await refreshTeams();
    } catch (err) {
      setError(err.message);
    }
  }

  const isAdmin = myRole === "admin";

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            {activeTeam
              ? `Managing "${activeTeam.name}"`
              : "Create or join a team to share SEO data with collaborators."}
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            New Team
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Create team form */}
      {showCreate && (
        <form onSubmit={handleCreateTeam} className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-3">Create a New Team</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !newTeamName.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* No active team state */}
      {!activeTeam && !showCreate && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <UsersIcon className="h-12 w-12" />
          <p className="text-lg font-medium text-foreground">No team selected</p>
          <p className="text-sm text-center max-w-md">
            {userTeams.length > 0
              ? "Switch to a team using the team switcher in the sidebar, or create a new one."
              : "Create your first team to start collaborating with others."}
          </p>
        </div>
      )}

      {/* Active team management */}
      {activeTeam && (
        <>
          {/* Team settings (admin only) */}
          {isAdmin && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-muted-foreground" />
                Team Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Team Name
                  </label>
                  {editing ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        autoFocus
                      />
                      <button onClick={handleUpdateTeamName} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-1.5 text-sm">
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium">{activeTeam.name}</span>
                      <button
                        onClick={() => { setEditName(activeTeam.name); setEditing(true); }}
                        className="rounded p-1 hover:bg-accent text-muted-foreground"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={handleDeleteTeam}
                    className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1.5"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Delete Team
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invite form (admin only) */}
          {isAdmin && (
            <form onSubmit={handleInvite} className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                Invite Member
              </h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {inviting ? "Sending..." : "Invite"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Viewers can read data. Members can read and write. Admins can manage the team.
              </p>
            </form>
          )}

          {/* Members table */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              Members ({members.length})
            </h3>
            {members.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">User</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Role</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Joined</th>
                      {isAdmin && <th className="pb-3 font-medium text-muted-foreground" />}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs">
                            {m.user_id === user?.id ? `${user.email} (you)` : m.user_id.slice(0, 8) + "..."}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {isAdmin && m.user_id !== user?.id ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleChangeRole(m.id, e.target.value)}
                              className="rounded border border-border bg-background px-2 py-1 text-xs"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <RoleBadge role={m.role} />
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">
                          {new Date(m.joined_at).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="py-3 text-right">
                            {m.user_id !== user?.id && (
                              <button
                                onClick={() => handleRemoveMember(m.id)}
                                className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                Pending Invitations ({invitations.length})
              </h3>
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited as {inv.role} — expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

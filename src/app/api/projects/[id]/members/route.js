import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canInviteToProject, getEffectiveProjectRole } from "@/lib/permissions";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getUserProjectRole(user.id, id);

  if (!role) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Get project details
  const { data: project } = await admin
    .from("projects")
    .select("owner_id, team_id")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Get direct project members
  const { data: directMembers } = await admin
    .from("project_members")
    .select("id, user_id, role, created_at, profiles(full_name, email)")
    .eq("project_id", id);

  // Get team members if team project
  let teamMembers = [];
  if (project.team_id) {
    const { data: tm } = await admin
      .from("team_members")
      .select("id, user_id, role, profiles(full_name, email)")
      .eq("team_id", project.team_id);
    teamMembers = tm || [];
  }

  // Build combined member list with effective roles
  const memberMap = new Map();

  // Add team members first
  for (const tm of teamMembers) {
    memberMap.set(tm.user_id, {
      userId: tm.user_id,
      name: tm.profiles?.full_name || null,
      email: tm.profiles?.email || null,
      teamRole: tm.role,
      projectRole: null,
      effectiveRole: tm.role,
      source: "team",
      isOwner: tm.user_id === project.owner_id,
    });
  }

  // Add/overlay direct project members
  for (const pm of (directMembers || [])) {
    const existing = memberMap.get(pm.user_id);
    const teamRole = existing?.teamRole || null;
    const effectiveRole = getEffectiveProjectRole(teamRole, pm.role);

    memberMap.set(pm.user_id, {
      userId: pm.user_id,
      name: pm.profiles?.full_name || null,
      email: pm.profiles?.email || null,
      teamRole,
      projectRole: pm.role,
      effectiveRole,
      projectMemberId: pm.id,
      source: existing ? "both" : "project",
      isOwner: pm.user_id === project.owner_id,
    });
  }

  // Ensure owner is always in the list
  if (!memberMap.has(project.owner_id)) {
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", project.owner_id)
      .single();

    memberMap.set(project.owner_id, {
      userId: project.owner_id,
      name: ownerProfile?.full_name || null,
      email: ownerProfile?.email || null,
      teamRole: null,
      projectRole: null,
      effectiveRole: "owner",
      source: "owner",
      isOwner: true,
    });
  }

  return NextResponse.json({ members: [...memberMap.values()] });
}

export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const actorRole = await getUserProjectRole(user.id, id);

  if (!actorRole || !canInviteToProject(actorRole)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, role: memberRole } = body;

  if (!email || !memberRole) {
    return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
  }

  if (!["admin", "editor", "viewer"].includes(memberRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Find user by email
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("project_members")
    .upsert({
      project_id: id,
      user_id: targetProfile.id,
      role: memberRole,
      granted_by: user.id,
    }, { onConflict: "project_id,user_id" })
    .select("id, user_id, role, created_at, profiles(full_name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data }, { status: 201 });
}

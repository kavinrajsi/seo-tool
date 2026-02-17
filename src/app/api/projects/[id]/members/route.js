import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { canInviteToProject, canRemoveMember } from "@/lib/permissions";

async function getUserProjectRole(admin, userId, projectId) {
  const { data } = await admin
    .from("project_members")
    .select("role")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .single();
  return data?.role || null;
}

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getUserProjectRole(admin, user.id, id);
  if (!role) {
    return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
  }

  const { data: members, error } = await admin
    .from("project_members")
    .select("id, user_id, role, created_at, profiles(id, full_name, email)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members });
}

export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actorRole = await getUserProjectRole(admin, user.id, id);
  if (!canInviteToProject(actorRole)) {
    return NextResponse.json({ error: "You don't have permission to invite members" }, { status: 403 });
  }

  const { email, role } = await request.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const validRoles = ["viewer", "editor", "admin"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Find user by email
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("project_members")
    .select("id")
    .eq("project_id", id)
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "User is already a member of this project" }, { status: 409 });
  }

  const { data: member, error } = await admin
    .from("project_members")
    .insert({
      project_id: id,
      user_id: profile.id,
      role,
      granted_by: user.id,
    })
    .select("id, user_id, role, created_at, profiles(id, full_name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("member_id");

  if (!memberId) {
    return NextResponse.json({ error: "member_id is required" }, { status: 400 });
  }

  const actorRole = await getUserProjectRole(admin, user.id, id);

  // Get the target member's role
  const { data: target } = await admin
    .from("project_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("project_id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!canRemoveMember(actorRole, target.role)) {
    return NextResponse.json({ error: "You don't have permission to remove this member" }, { status: 403 });
  }

  const { error } = await admin
    .from("project_members")
    .delete()
    .eq("id", memberId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

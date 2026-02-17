import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getProjectMembership } from "@/lib/projectAccess";
import { getRoleLevel } from "@/lib/permissions";

export async function DELETE(request, { params }) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myRole = await getProjectMembership(id, user.id);
  if (!myRole || getRoleLevel(myRole) < 3) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Get target member
  const { data: target } = await admin
    .from("project_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("project_id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the project owner" }, { status: 403 });
  }

  if (getRoleLevel(myRole) <= getRoleLevel(target.role)) {
    return NextResponse.json({ error: "Cannot remove a member with equal or higher role" }, { status: 403 });
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

export async function PATCH(request, { params }) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myRole = await getProjectMembership(id, user.id);
  if (!myRole || getRoleLevel(myRole) < 3) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { role: newRole } = await request.json();
  const validRoles = ["viewer", "editor", "admin"];
  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Get target member
  const { data: target } = await admin
    .from("project_members")
    .select("role")
    .eq("id", memberId)
    .eq("project_id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 403 });
  }

  if (getRoleLevel(newRole) >= getRoleLevel(myRole)) {
    return NextResponse.json({ error: "Cannot assign a role equal to or higher than your own" }, { status: 403 });
  }

  const { error } = await admin
    .from("project_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getProjectMembership } from "@/lib/projectAccess";

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getProjectMembership(id, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
  }

  const { data: members, error } = await admin
    .from("project_members")
    .select("id, user_id, role, created_at, profiles(id, name, email)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    name: m.profiles?.name || null,
    email: m.profiles?.email || null,
    created_at: m.created_at,
  }));

  return NextResponse.json({ members: formatted });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myRole = await getProjectMembership(id, user.id);
  if (!myRole || (myRole !== "owner" && myRole !== "admin")) {
    return NextResponse.json({ error: "Not authorized to add members" }, { status: 403 });
  }

  const { email, role } = await request.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const validRoles = ["viewer", "editor", "admin"];
  const memberRole = validRoles.includes(role) ? role : "viewer";

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
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  const { error } = await admin.from("project_members").insert({
    project_id: id,
    user_id: profile.id,
    role: memberRole,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

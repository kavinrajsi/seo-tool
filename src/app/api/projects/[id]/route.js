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

  const { data: project, error } = await admin
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ...project, role });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getProjectMembership(id, user.id);
  if (!role || (role !== "owner" && role !== "admin")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.color !== undefined) updates.color = body.color;
  if (body.website_url !== undefined) updates.website_url = body.website_url?.trim() || null;
  if (body.team_id !== undefined) updates.team_id = body.team_id || null;

  const { data, error } = await admin
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getProjectMembership(id, user.id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete a project" }, { status: 403 });
  }

  const { error } = await admin.from("projects").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

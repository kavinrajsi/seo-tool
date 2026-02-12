import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canManageProject } from "@/lib/permissions";

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

  const { data, error } = await admin
    .from("projects")
    .select("*, teams(id, name)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project: data, role });
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getUserProjectRole(user.id, id);

  if (!role || !canManageProject(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.color !== undefined) updates.color = body.color;
  if (body.websiteUrl !== undefined) updates.website_url = body.websiteUrl?.trim() || null;
  if (body.scanMode !== undefined) {
    const mode = body.scanMode === "manual" ? "manual" : "auto";
    updates.scan_mode = mode;
  }

  const { data, error } = await admin
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select("*, teams(id, name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Only project owner can delete
  const { data: project } = await admin
    .from("projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the project owner can delete this project" }, { status: 403 });
  }

  const { error } = await admin
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

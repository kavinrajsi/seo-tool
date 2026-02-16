import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canDeleteProjectData } from "@/lib/permissions";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await admin
    .from("sitemap_visualizations")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = data.user_id === user.id;
  let hasProjectAccess = false;
  if (data.project_id) {
    const projectRole = await getUserProjectRole(user.id, data.project_id);
    hasProjectAccess = !!projectRole;
  }

  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: record } = await admin
    .from("sitemap_visualizations")
    .select("user_id, project_id")
    .eq("id", id)
    .single();

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = record.user_id === user.id;
  let hasProjectAccess = false;
  if (record.project_id) {
    const projectRole = await getUserProjectRole(user.id, record.project_id);
    hasProjectAccess = projectRole && canDeleteProjectData(projectRole);
  }

  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await admin
    .from("sitemap_visualizations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

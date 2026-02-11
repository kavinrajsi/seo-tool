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
    .from("broken_link_scans")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const isOwner = data.user_id === user.id;
  let hasProjectAccess = false;
  if (data.project_id) {
    const projectRole = await getUserProjectRole(user.id, data.project_id);
    hasProjectAccess = !!projectRole;
  }

  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
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

  const { data: scan } = await admin
    .from("broken_link_scans")
    .select("user_id, project_id")
    .eq("id", id)
    .single();

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const isOwner = scan.user_id === user.id;
  let hasProjectAccess = false;
  if (scan.project_id) {
    const projectRole = await getUserProjectRole(user.id, scan.project_id);
    hasProjectAccess = projectRole && canDeleteProjectData(projectRole);
  }

  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await admin
    .from("broken_link_scans")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

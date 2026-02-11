import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await admin
    .from("reports")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Access check: owner OR project member
  const isOwner = data.user_id === user.id;
  let hasProjectAccess = false;
  if (data.project_id) {
    const projectRole = await getUserProjectRole(user.id, data.project_id);
    hasProjectAccess = !!projectRole;
  }

  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
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

  // Check if user is admin
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Fetch the report first to check project access
  const { data: report } = await admin
    .from("reports")
    .select("user_id, project_id")
    .eq("id", id)
    .single();

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isOwner = report.user_id === user.id;
  const isAppAdmin = profile?.role === "admin";
  let hasProjectAccess = false;
  if (report.project_id) {
    const { canDeleteProjectData } = await import("@/lib/permissions");
    const projectRole = await getUserProjectRole(user.id, report.project_id);
    hasProjectAccess = projectRole && canDeleteProjectData(projectRole);
  }

  if (!isOwner && !isAppAdmin && !hasProjectAccess) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await admin
    .from("reports")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

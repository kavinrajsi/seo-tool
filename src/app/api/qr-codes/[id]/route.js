import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canEditProjectData, canDeleteProjectData } from "@/lib/permissions";

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch QR code first for access check
  const { data: qr } = await admin.from("qr_codes").select("user_id, project_id").eq("id", id).single();
  if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });

  const isOwner = qr.user_id === user.id;
  let hasProjectAccess = false;
  if (qr.project_id) {
    const projectRole = await getUserProjectRole(user.id, qr.project_id);
    hasProjectAccess = projectRole && canEditProjectData(projectRole);
  }
  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};
  if (body.content !== undefined) updates.content = body.content;

  const { data, error } = await admin
    .from("qr_codes")
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
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: qr } = await admin.from("qr_codes").select("user_id, project_id").eq("id", id).single();
  if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });

  const isOwner = qr.user_id === user.id;
  let hasProjectAccess = false;
  if (qr.project_id) {
    const projectRole = await getUserProjectRole(user.id, qr.project_id);
    hasProjectAccess = projectRole && canDeleteProjectData(projectRole);
  }
  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await admin
    .from("qr_codes")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

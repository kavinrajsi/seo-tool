import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canEditProjectData, canDeleteProjectData } from "@/lib/permissions";

async function checkEventAccess(admin, user, id, requiredPerm) {
  const { data: event } = await admin
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) return { error: "Event not found", status: 404 };

  // Owner can always access
  if (event.user_id === user.id) return { event };

  // Check project access
  if (event.project_id) {
    const projectRole = await getUserProjectRole(user.id, event.project_id);
    if (!projectRole) return { error: "Not found", status: 404 };
    if (requiredPerm === "edit" && !canEditProjectData(projectRole)) {
      return { error: "Insufficient permissions", status: 403 };
    }
    if (requiredPerm === "delete" && !canDeleteProjectData(projectRole)) {
      return { error: "Insufficient permissions", status: 403 };
    }
    return { event };
  }

  return { error: "Not found", status: 404 };
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const access = await checkEventAccess(admin, user, id, "edit");
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.tips !== undefined) updates.tips = Array.isArray(body.tips) ? body.tips.filter(Boolean) : null;
  if (body.start_date !== undefined) updates.start_date = body.start_date;
  if (body.end_date !== undefined) updates.end_date = body.end_date;
  if (body.color !== undefined) updates.color = body.color || null;
  updates.updated_at = new Date().toISOString();

  const { data: event, error } = await admin
    .from("calendar_events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Calendar Events API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const access = await checkEventAccess(admin, user, id, "delete");
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { error } = await admin
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Calendar Events API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

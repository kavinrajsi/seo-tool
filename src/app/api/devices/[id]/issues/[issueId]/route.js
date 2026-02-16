import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id, issueId } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates = {};
  if (body.issue_status !== undefined) updates.issue_status = body.issue_status;
  if (body.resolution_notes !== undefined) updates.resolution_notes = body.resolution_notes;
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description;

  if (body.issue_status === "resolved" && !updates.resolved_at) {
    updates.resolved_at = new Date().toISOString();
  }

  const { data: issue, error } = await admin
    .from("device_issues")
    .update(updates)
    .eq("id", issueId)
    .eq("device_id", id)
    .select("*, reporter:employees!device_issues_reported_by_fkey(id, first_name, last_name)")
    .single();

  if (error) {
    console.error("[Device Issues API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ issue });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id, issueId } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await admin
    .from("device_issues")
    .delete()
    .eq("id", issueId)
    .eq("device_id", id);

  if (error) {
    console.error("[Device Issues API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

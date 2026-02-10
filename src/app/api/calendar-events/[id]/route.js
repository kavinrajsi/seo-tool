import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

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
    .eq("user_id", user.id)
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

  const { error } = await admin
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[Calendar Events API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

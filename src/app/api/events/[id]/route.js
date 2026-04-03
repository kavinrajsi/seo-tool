import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase } = auth;
  const { id } = await params;

  const { data: event, error } = await supabase
    .from("events")
    .select("*, event_registrations(id, user_id, status, user_name, user_email, created_at)")
    .eq("id", id)
    .single();

  if (error || !event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event });
}

export async function DELETE(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  const { data: event } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: employee } = await supabase
    .from("employees").select("role").eq("work_email", user.email).maybeSingle();

  const canDelete = event.created_by === user.id || employee?.role === "admin" || employee?.role === "owner";
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

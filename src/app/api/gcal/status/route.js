import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  const admin = createAdminClient();
  let query = admin
    .from("gcal_connections")
    .select("google_email, calendar_id, connected_at, last_synced_at")
    .eq("user_id", user.id);
  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }
  const { data: connection } = await query.maybeSingle();

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    googleEmail: connection.google_email,
    calendarId: connection.calendar_id,
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("gcal_connections")
    .select("google_email, calendar_id, connected_at, last_synced_at")
    .eq("user_id", user.id)
    .single();

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

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get the current connection to revoke the token
  const { data: connection } = await admin
    .from("gsc_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No GSC connection found" }, { status: 404 });
  }

  // Revoke the token at Google (best-effort)
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${connection.access_token}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch {
    // Non-critical — continue with deletion even if revoke fails
  }

  // Delete the connection
  const { error: dbError } = await admin
    .from("gsc_connections")
    .delete()
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

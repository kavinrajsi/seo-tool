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

  const { data: connection } = await admin
    .from("instagram_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No Instagram connection found" }, { status: 404 });
  }

  // Delete related data first, then the connection
  await admin.from("instagram_insights").delete().eq("user_id", user.id);
  await admin.from("instagram_posts").delete().eq("user_id", user.id);

  const { error: dbError } = await admin
    .from("instagram_connections")
    .delete()
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

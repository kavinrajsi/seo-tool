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
    .from("instagram_connections")
    .select("username, account_type, profile_picture_url, followers_count, media_count, connected_at")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    username: connection.username,
    accountType: connection.account_type,
    profilePictureUrl: connection.profile_picture_url,
    followersCount: connection.followers_count,
    mediaCount: connection.media_count,
    connectedAt: connection.connected_at,
  });
}

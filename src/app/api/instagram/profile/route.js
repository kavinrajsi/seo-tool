import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("instagram_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 404 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token expired. Please reconnect Instagram." }, { status: 401 });
  }

  const profileRes = await fetch(
    `https://graph.facebook.com/v21.0/${connection.instagram_user_id}?fields=username,name,biography,profile_picture_url,followers_count,follows_count,media_count,account_type&access_token=${accessToken}`
  );

  if (!profileRes.ok) {
    return NextResponse.json({ error: "Failed to fetch Instagram profile" }, { status: 502 });
  }

  const profile = await profileRes.json();

  // Update stored profile data
  await admin
    .from("instagram_connections")
    .update({
      username: profile.username,
      account_type: profile.account_type,
      profile_picture_url: profile.profile_picture_url,
      biography: profile.biography,
      followers_count: profile.followers_count || 0,
      media_count: profile.media_count || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return NextResponse.json({
    username: profile.username,
    name: profile.name,
    biography: profile.biography,
    profilePictureUrl: profile.profile_picture_url,
    followersCount: profile.followers_count || 0,
    followsCount: profile.follows_count || 0,
    mediaCount: profile.media_count || 0,
    accountType: profile.account_type,
  });
}

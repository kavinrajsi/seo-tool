import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = new URL(request.url).origin;
  const redirectUrl = new URL("/dashboard/settings", baseUrl);

  if (error) {
    redirectUrl.searchParams.set("ig_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    redirectUrl.searchParams.set("ig_error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  // Parse state: userId:projectId
  const [userId, projectId] = state.split(":");

  // Verify the user is authenticated and matches the state
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    redirectUrl.searchParams.set("ig_error", "auth_mismatch");
    return NextResponse.redirect(redirectUrl);
  }

  // Step 1: Exchange code for short-lived token
  const tokenRes = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: process.env.META_INSTAGRAM_REDIRECT_URI,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    redirectUrl.searchParams.set("ig_error", "token_exchange_failed");
    return NextResponse.redirect(redirectUrl);
  }

  const shortLivedTokens = await tokenRes.json();

  // Step 2: Exchange short-lived token for long-lived token (60 days)
  const longLivedRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortLivedTokens.access_token,
      })
  );

  if (!longLivedRes.ok) {
    redirectUrl.searchParams.set("ig_error", "long_lived_token_failed");
    return NextResponse.redirect(redirectUrl);
  }

  const longLivedTokens = await longLivedRes.json();
  const accessToken = longLivedTokens.access_token;
  const expiresIn = longLivedTokens.expires_in || 5184000; // 60 days default

  // Step 3: Get Facebook Pages to find Instagram Business Account
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
  );

  if (!pagesRes.ok) {
    redirectUrl.searchParams.set("ig_error", "pages_fetch_failed");
    return NextResponse.redirect(redirectUrl);
  }

  const pagesData = await pagesRes.json();
  const pages = pagesData.data || [];

  // Find the Instagram Business Account ID from the first page with one
  let igUserId = null;
  for (const page of pages) {
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
    );
    if (igRes.ok) {
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id) {
        igUserId = igData.instagram_business_account.id;
        break;
      }
    }
  }

  if (!igUserId) {
    redirectUrl.searchParams.set("ig_error", "no_instagram_account");
    return NextResponse.redirect(redirectUrl);
  }

  // Step 4: Fetch Instagram profile info
  const profileRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}?fields=username,name,biography,profile_picture_url,followers_count,media_count,account_type&access_token=${accessToken}`
  );

  let profile = {};
  if (profileRes.ok) {
    profile = await profileRes.json();
  }

  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Step 5: Store the connection
  const admin = createAdminClient();
  const parsedProjectId = projectId || null;

  // Delete existing connection for this user+project, then insert
  let deleteQuery = admin.from("instagram_connections").delete().eq("user_id", user.id);
  if (parsedProjectId) {
    deleteQuery = deleteQuery.eq("project_id", parsedProjectId);
  } else {
    deleteQuery = deleteQuery.is("project_id", null);
  }
  await deleteQuery;

  const { error: dbError } = await admin
    .from("instagram_connections")
    .insert({
      user_id: user.id,
      project_id: parsedProjectId,
      instagram_user_id: igUserId,
      username: profile.username || null,
      account_type: profile.account_type || "BUSINESS",
      profile_picture_url: profile.profile_picture_url || null,
      biography: profile.biography || null,
      followers_count: profile.followers_count || 0,
      media_count: profile.media_count || 0,
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    });

  if (dbError) {
    redirectUrl.searchParams.set("ig_error", "db_save_failed");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("ig_connected", "true");
  return NextResponse.redirect(redirectUrl);
}

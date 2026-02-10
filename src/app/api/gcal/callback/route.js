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
    redirectUrl.searchParams.set("gcal_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    redirectUrl.searchParams.set("gcal_error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify the user is authenticated and matches the state
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    redirectUrl.searchParams.set("gcal_error", "auth_mismatch");
    return NextResponse.redirect(redirectUrl);
  }

  // Exchange auth code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_GCAL_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    redirectUrl.searchParams.set("gcal_error", "token_exchange_failed");
    return NextResponse.redirect(redirectUrl);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  if (!access_token || !refresh_token) {
    redirectUrl.searchParams.set("gcal_error", "no_refresh_token");
    return NextResponse.redirect(redirectUrl);
  }

  // Get the Google user's email
  let googleEmail = null;
  try {
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (userinfoRes.ok) {
      const userinfo = await userinfoRes.json();
      googleEmail = userinfo.email;
    }
  } catch {
    // Non-critical, continue without email
  }

  const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  // Store the connection using admin client (bypasses RLS)
  const admin = createAdminClient();
  const { error: dbError } = await admin
    .from("gcal_connections")
    .upsert(
      {
        user_id: user.id,
        google_email: googleEmail,
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes: "calendar.events openid email",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (dbError) {
    redirectUrl.searchParams.set("gcal_error", "db_save_failed");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("gcal_connected", "true");
  return NextResponse.redirect(redirectUrl);
}

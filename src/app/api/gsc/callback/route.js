import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = new URL(request.url).origin;
  const settingsUrl = new URL("/dashboard/settings", baseUrl);

  if (error) {
    settingsUrl.searchParams.set("gsc_error", error);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set("gsc_error", "missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  // Verify the user is authenticated and matches the state
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    settingsUrl.searchParams.set("gsc_error", "auth_mismatch");
    return NextResponse.redirect(settingsUrl);
  }

  // Exchange auth code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_GSC_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    settingsUrl.searchParams.set("gsc_error", "token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  if (!access_token || !refresh_token) {
    settingsUrl.searchParams.set("gsc_error", "no_refresh_token");
    return NextResponse.redirect(settingsUrl);
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
    .from("gsc_connections")
    .upsert(
      {
        user_id: user.id,
        google_email: googleEmail,
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes: "webmasters.readonly openid email",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (dbError) {
    settingsUrl.searchParams.set("gsc_error", "db_save_failed");
    return NextResponse.redirect(settingsUrl);
  }

  settingsUrl.searchParams.set("gsc_connected", "true");
  return NextResponse.redirect(settingsUrl);
}

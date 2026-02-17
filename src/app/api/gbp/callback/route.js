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
    redirectUrl.searchParams.set("gbp_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    redirectUrl.searchParams.set("gbp_error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  // Parse state: userId:projectId
  const [userId, projectId] = state.split(":");

  // Verify the user is authenticated and matches the state
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    redirectUrl.searchParams.set("gbp_error", "auth_mismatch");
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
      redirect_uri: process.env.GOOGLE_GBP_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    redirectUrl.searchParams.set("gbp_error", "token_exchange_failed");
    return NextResponse.redirect(redirectUrl);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  if (!access_token || !refresh_token) {
    redirectUrl.searchParams.set("gbp_error", "no_refresh_token");
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
  const parsedProjectId = projectId || null;

  // Delete existing connection for this user+project, then insert
  let deleteQuery = admin.from("gbp_connections").delete().eq("user_id", user.id);
  if (parsedProjectId) {
    deleteQuery = deleteQuery.eq("project_id", parsedProjectId);
  } else {
    deleteQuery = deleteQuery.is("project_id", null);
  }
  await deleteQuery;

  const { error: dbError } = await admin
    .from("gbp_connections")
    .insert({
      user_id: user.id,
      project_id: parsedProjectId,
      google_email: googleEmail,
      access_token,
      refresh_token,
      token_expires_at: tokenExpiresAt,
      scopes: "business.manage openid email",
      updated_at: new Date().toISOString(),
    });

  if (dbError) {
    redirectUrl.searchParams.set("gbp_error", "db_save_failed");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("gbp_connected", "true");
  return NextResponse.redirect(redirectUrl);
}

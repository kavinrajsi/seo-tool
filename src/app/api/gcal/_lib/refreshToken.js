import { createAdminClient } from "@/lib/supabase/admin";

export async function getValidToken(connection) {
  const expiresAt = new Date(connection.token_expires_at);

  // If token is still valid (not expiring within 60s), return it
  if (expiresAt > new Date(Date.now() + 60000)) {
    return connection.access_token;
  }

  // Refresh the token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    return null;
  }

  const tokens = await res.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const admin = createAdminClient();
  await admin
    .from("gcal_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

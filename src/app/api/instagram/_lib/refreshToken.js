import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Refreshes a long-lived Instagram token if it expires within 7 days.
 * Long-lived tokens last 60 days and can be refreshed when they have
 * more than 24 hours but less than 60 days of validity remaining.
 *
 * Returns a valid access_token or null if refresh fails.
 */
export async function getValidToken(connection) {
  const expiresAt = new Date(connection.token_expires_at);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Token is still valid and not near expiry
  if (expiresAt > sevenDaysFromNow) {
    return connection.access_token;
  }

  // Token already expired
  if (expiresAt <= new Date()) {
    return null;
  }

  // Token expires within 7 days — refresh it
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?` +
      new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: connection.access_token,
      }),
    { method: "GET" }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const newExpiresAt = new Date(
    Date.now() + data.expires_in * 1000
  ).toISOString();

  const admin = createAdminClient();
  await admin
    .from("instagram_connections")
    .update({
      access_token: data.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return data.access_token;
}

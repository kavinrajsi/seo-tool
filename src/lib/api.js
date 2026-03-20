import { supabase } from "./supabase";

/**
 * Fetch wrapper that automatically adds the Supabase auth token.
 * Uses getSession() first, falls back to getUser() if session is null
 * (can happen before auth state is fully initialized from storage).
 */
export async function apiFetch(url, options = {}) {
  let token = null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    token = session.access_token;
  } else {
    // getSession() can return null before auth initializes from storage;
    // refreshSession() forces a token refresh from Supabase servers.
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    token = refreshed?.access_token ?? null;
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

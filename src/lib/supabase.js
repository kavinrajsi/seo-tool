import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

let _supabase = null;

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = SUPABASE_KEY;

    if (!url || !key || key === "undefined") {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in your environment."
      );
    }

    _supabase = createBrowserClient(url, key);
  }
  return _supabase;
}

// Per-request authenticated Supabase client — sets the user's JWT so auth.uid() works in RLS
export function getSupabaseWithAuth(accessToken) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_KEY,
    {
      accessToken: async () => accessToken,
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
  );
}

// Backward-compat: proxy that lazily initializes on first property access
export const supabase = new Proxy({}, {
  get(_, prop) {
    return getSupabase()[prop];
  },
});

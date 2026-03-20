import { createClient } from "@supabase/supabase-js";

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    );
  }
  return _supabase;
}

// Per-request authenticated Supabase client — sets the user's JWT so auth.uid() works in RLS
export function getSupabaseWithAuth(accessToken) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
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

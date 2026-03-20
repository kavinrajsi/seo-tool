import { getSupabase, getSupabaseWithAuth } from "./supabase";

/**
 * Get the current user and an authenticated Supabase client from the request.
 * The returned `supabase` client carries the user's JWT so auth.uid() works in RLS.
 * @param {Request} req
 * @returns {Promise<{ user: object, supabase: object } | null>}
 */
export async function getUserFromRequest(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const { data: { user } } = await getSupabase().auth.getUser(token);
    if (!user) return null;

    return { user, supabase: getSupabaseWithAuth(token) };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

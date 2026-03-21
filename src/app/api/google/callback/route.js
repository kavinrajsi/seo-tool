import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseWithAuth } from "@/lib/supabase";
import { getTokensFromCode } from "@/lib/google";

export const maxDuration = 30;

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${url.origin}/ga?error=auth_failed`);
  }

  try {
    // Use cookie-based auth to get session (this is a GET redirect from Google, no Bearer token)
    const cookieClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { session } } = await cookieClient.auth.getSession();
    if (!session?.user) {
      return NextResponse.redirect(`${url.origin}/signin`);
    }

    // Create an authenticated client with the user's JWT for RLS
    const supabase = getSupabaseWithAuth(session.access_token);
    const user = session.user;

    const redirectUri = `${url.origin}/api/google/callback`;
    const tokens = await getTokensFromCode(code, redirectUri);

    // Upsert tokens for this user
    const { error: dbError } = await supabase
      .from("google_tokens")
      .upsert(
        {
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("Failed to store tokens:", dbError);
      return NextResponse.redirect(`${url.origin}/ga?error=storage_failed`);
    }

    return NextResponse.redirect(`${url.origin}/ga?connected=true`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${url.origin}/ga?error=auth_failed`);
  }
}

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
    // Read auth session from cookies (this is a redirect from Google, no Bearer header)
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

    // getUser() verifies with Supabase Auth API — works with cookies
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${url.origin}/signin`);
    }

    // getSession() returns the access_token from cookies for DB writes
    const { data: { session } } = await cookieClient.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.redirect(`${url.origin}/signin`);
    }

    // Create an authenticated client with the JWT so RLS works for writes
    const supabase = getSupabaseWithAuth(session.access_token);

    const redirectUri = `${url.origin}/api/google/callback`;
    const tokens = await getTokensFromCode(code, redirectUri);

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

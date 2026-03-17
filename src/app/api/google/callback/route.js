import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTokensFromCode } from "@/lib/google";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${url.origin}/ga?error=auth_failed`);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${url.origin}/signin`);
    }

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

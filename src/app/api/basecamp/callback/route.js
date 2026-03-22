import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/settings?error=no_code", req.url));
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://tool.madarth.com"}/api/basecamp/callback`;

    // Exchange code for access token
    const tokenRes = await fetch("https://launchpad.37signals.com/authorization/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "web_server",
        client_id: process.env.BASECAMP_CLIENT_ID,
        client_secret: process.env.BASECAMP_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/settings?error=token_exchange_failed", req.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Get user's Basecamp authorization (account info)
    const authRes = await fetch("https://launchpad.37signals.com/authorization.json", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!authRes.ok) {
      return NextResponse.redirect(new URL("/settings?error=auth_check_failed", req.url));
    }

    const authData = await authRes.json();
    const bc3Account = authData.accounts?.find((a) => a.product === "bc3");

    if (!bc3Account) {
      return NextResponse.redirect(new URL("/settings?error=no_bc3_account", req.url));
    }

    // Get the authenticated Supabase user from cookies
    const { createServerClient } = await import("@supabase/ssr");
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/signin", req.url));
    }

    // Save to basecamp_config using secret key (bypasses RLS)
    await supabase.from("basecamp_config").upsert(
      {
        user_id: user.id,
        account_id: String(bc3Account.id),
        access_token: accessToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(new URL("/settings?msg=Basecamp+connected", req.url));
  } catch (err) {
    logError("basecamp/callback", err);
    return NextResponse.redirect(new URL("/settings?error=callback_failed", req.url));
  }
}

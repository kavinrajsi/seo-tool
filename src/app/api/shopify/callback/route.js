import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { logError } from "@/lib/logger";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shop = url.searchParams.get("shop");

    if (!code || !shop) {
      return NextResponse.redirect(new URL("/settings?error=shopify_no_code", req.url));
    }

    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/settings?error=shopify_token_failed", req.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const scopes = tokenData.scope || "";

    // Get authenticated user from cookies
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/signin", req.url));
    }

    // Save config using service key (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    await supabase.from("shopify_config").upsert({
      user_id: user.id,
      shop_domain: shop,
      access_token: accessToken,
      scopes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.redirect(new URL("/settings?msg=Shopify+connected", req.url));
  } catch (err) {
    logError("shopify/callback", err);
    return NextResponse.redirect(new URL("/settings?error=shopify_failed", req.url));
  }
}

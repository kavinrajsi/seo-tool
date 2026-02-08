import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { registerWebhooks } from "@/app/api/shopify/_lib/registerWebhooks";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  const baseUrl = new URL(request.url).origin;
  const redirectUrl = new URL("/dashboard/ecommerce", baseUrl);

  // Validate required params
  if (!code || !shop || !state || !hmac) {
    redirectUrl.searchParams.set("shopify_error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  // Validate HMAC signature
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    redirectUrl.searchParams.set("shopify_error", "not_configured");
    return NextResponse.redirect(redirectUrl);
  }

  // Build the message string from all query params except hmac
  const queryParams = new URLSearchParams(searchParams);
  queryParams.delete("hmac");
  // Sort params alphabetically for HMAC validation
  const sortedParams = new URLSearchParams([...queryParams.entries()].sort());
  const message = sortedParams.toString();

  const generatedHmac = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  if (generatedHmac !== hmac) {
    redirectUrl.searchParams.set("shopify_error", "invalid_hmac");
    return NextResponse.redirect(redirectUrl);
  }

  // Validate state (user_id:shop_domain)
  const [userId, shopDomain] = state.split(":");
  if (!userId || !shopDomain) {
    redirectUrl.searchParams.set("shopify_error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify authenticated user matches state
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    redirectUrl.searchParams.set("shopify_error", "auth_mismatch");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify shop matches state
  const normalizedShop = shop
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");

  if (normalizedShop !== shopDomain) {
    redirectUrl.searchParams.set("shopify_error", "shop_mismatch");
    return NextResponse.redirect(redirectUrl);
  }

  // Exchange auth code for permanent access token
  const tokenRes = await fetch(
    `https://${normalizedShop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: secret,
        code,
      }),
    }
  );

  if (!tokenRes.ok) {
    redirectUrl.searchParams.set("shopify_error", "token_exchange_failed");
    return NextResponse.redirect(redirectUrl);
  }

  const tokenData = await tokenRes.json();
  const { access_token } = tokenData;

  if (!access_token) {
    redirectUrl.searchParams.set("shopify_error", "no_access_token");
    return NextResponse.redirect(redirectUrl);
  }

  // Fetch shop info (best-effort)
  let storeName = null;
  try {
    const shopRes = await fetch(
      `https://${normalizedShop}/admin/api/2024-01/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": access_token,
          "Content-Type": "application/json",
        },
      }
    );
    if (shopRes.ok) {
      const shopData = await shopRes.json();
      storeName = shopData.shop?.name || null;
    }
  } catch {
    // Non-critical
  }

  // Generate webhook secret
  const webhookSecret = crypto.randomBytes(32).toString("hex");

  // Save connection to database
  const admin = createAdminClient();
  const { error: dbError } = await admin
    .from("shopify_connections")
    .upsert(
      {
        user_id: user.id,
        shop_domain: normalizedShop,
        store_name: storeName,
        access_token,
        webhook_secret: webhookSecret,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (dbError) {
    console.error("Failed to save Shopify connection:", dbError);
    redirectUrl.searchParams.set("shopify_error", "db_save_failed");
    return NextResponse.redirect(redirectUrl);
  }

  // Auto-register webhooks (best-effort)
  try {
    const { registered } = await registerWebhooks(normalizedShop, access_token, baseUrl);

    if (registered.length > 0) {
      await admin
        .from("shopify_connections")
        .update({
          webhooks_enabled: true,
          webhook_url: `${baseUrl}/api/webhooks/shopify`,
          webhooks_registered: registered.filter((r) => r.id),
        })
        .eq("user_id", user.id);
    }
  } catch {
    // Non-critical — webhooks can be registered later
  }

  redirectUrl.searchParams.set("shopify_connected", "true");
  return NextResponse.redirect(redirectUrl);
}

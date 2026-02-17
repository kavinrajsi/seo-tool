import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json(
      { error: "shop parameter is required" },
      { status: 400 }
    );
  }

  // Normalize and validate shop domain
  const normalizedShop = shop
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");

  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(normalizedShop)) {
    return NextResponse.json(
      { error: "Invalid shop domain. Must be a *.myshopify.com domain." },
      { status: 400 }
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Shopify integration is not configured." },
      { status: 500 }
    );
  }

  const projectId = searchParams.get("project_id") || "";
  const state = `${user.id}:${projectId}:${normalizedShop}`;
  const scopes = "read_products,read_orders,write_orders,read_customers,read_inventory,write_fulfillments";

  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  const authUrl = `https://${normalizedShop}/admin/oauth/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}

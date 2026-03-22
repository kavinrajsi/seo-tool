import { NextResponse } from "next/server";

export async function GET(req) {
  const shop = new URL(req.url).searchParams.get("shop");
  if (!shop) {
    return NextResponse.json({ error: "shop parameter required (e.g. your-store.myshopify.com)" }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://tool.madarth.com";
  const redirectUri = `${origin}/api/shopify/callback`;
  const scopes = "read_products,read_orders,read_customers,read_inventory,read_analytics,read_reports,read_shipping";
  const nonce = Math.random().toString(36).slice(2);

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;

  return NextResponse.redirect(authUrl);
}

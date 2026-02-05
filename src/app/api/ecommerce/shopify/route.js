import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// GET: Fetch current Shopify connection
export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, store_url, store_name, connected_at, last_synced_at, webhooks_enabled, webhook_url, last_webhook_at, access_token")
    .eq("user_id", user.id)
    .single();

  // Determine if webhook-only based on whether access_token exists
  if (connection) {
    connection.webhook_only = !connection.access_token;
    delete connection.access_token; // Don't expose token to client
  }

  return NextResponse.json({ connection: connection || null });
}

// POST: Connect to Shopify store
export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storeUrl, accessToken, webhookOnly } = body;

  if (!storeUrl) {
    return NextResponse.json({ error: "Store URL is required" }, { status: 400 });
  }

  // Normalize store URL
  let normalizedUrl = storeUrl.trim().toLowerCase();
  if (!normalizedUrl.includes(".myshopify.com")) {
    normalizedUrl = `${normalizedUrl}.myshopify.com`;
  }
  normalizedUrl = normalizedUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Webhook-only connection (no API token required)
  if (webhookOnly) {
    const storeName = normalizedUrl.split(".")[0];

    // Try with webhook_only column first, fallback without it
    let data, error;
    const result = await admin
      .from("shopify_connections")
      .upsert({
        user_id: user.id,
        store_url: normalizedUrl,
        store_name: storeName,
        access_token: null,
        connected_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("id, store_url, store_name, connected_at")
      .single();

    data = result.data;
    error = result.error;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: { ...data, webhook_only: true } });
  }

  // Full API connection requires access token
  if (!accessToken) {
    return NextResponse.json({ error: "Access Token is required for API connection" }, { status: 400 });
  }

  // Verify connection by fetching shop info
  try {
    const shopRes = await fetch(`https://${normalizedUrl}/admin/api/2024-01/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopRes.ok) {
      return NextResponse.json({ error: "Invalid credentials or store URL" }, { status: 400 });
    }

    const shopData = await shopRes.json();
    const storeName = shopData.shop?.name || normalizedUrl;

    // Upsert connection
    const { data, error } = await admin
      .from("shopify_connections")
      .upsert({
        user_id: user.id,
        store_url: normalizedUrl,
        store_name: storeName,
        access_token: accessToken,
        connected_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("id, store_url, store_name, connected_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to connect to Shopify" }, { status: 500 });
  }
}

// DELETE: Disconnect Shopify store
export async function DELETE() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Delete products first
  await admin
    .from("shopify_products")
    .delete()
    .eq("user_id", user.id);

  // Delete connection
  const { error } = await admin
    .from("shopify_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

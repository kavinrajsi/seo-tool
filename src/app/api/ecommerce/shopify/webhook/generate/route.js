import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check for custom ngrok URL in request body
  let customBaseUrl = null;
  try {
    const body = await request.json();
    customBaseUrl = body?.ngrokUrl || body?.baseUrl;
  } catch {
    // No body or invalid JSON, continue with default
  }

  // Get Shopify connection
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, webhook_secret")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No Shopify connection found" }, { status: 400 });
  }

  // Get the host from headers
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || "https";

  // Generate webhook URL (use custom ngrok URL if provided)
  let webhookUrl;
  if (customBaseUrl) {
    // Normalize the custom URL
    const baseUrl = customBaseUrl.replace(/\/$/, "");
    webhookUrl = `${baseUrl}/api/ecommerce/shopify/webhook`;
  } else {
    webhookUrl = `${protocol}://${host}/api/ecommerce/shopify/webhook`;
  }

  // Use existing secret or generate a new one
  let webhookSecret = connection.webhook_secret;
  if (!webhookSecret) {
    webhookSecret = crypto.randomBytes(32).toString("hex");

    // Save the new secret
    await admin
      .from("shopify_connections")
      .update({
        webhook_secret: webhookSecret,
        webhooks_enabled: true,
        webhook_url: webhookUrl,
      })
      .eq("id", connection.id);
  } else {
    // Just update the URL if secret exists
    await admin
      .from("shopify_connections")
      .update({
        webhooks_enabled: true,
        webhook_url: webhookUrl,
      })
      .eq("id", connection.id);
  }

  return NextResponse.json({
    webhookUrl,
    webhookSecret,
    topics: [
      "products/create",
      "products/update",
      "products/delete",
      "orders/create",
      "orders/updated",
      "orders/cancelled",
      "orders/fulfilled",
      "orders/paid",
    ],
  });
}

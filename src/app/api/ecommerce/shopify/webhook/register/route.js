import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

const WEBHOOK_TOPICS = [
  "products/create",
  "products/update",
  "products/delete",
];

// POST: Register webhooks with Shopify
export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get Shopify connection
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, store_url, access_token")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No Shopify connection found" }, { status: 400 });
  }

  // Get the webhook URL from the request
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { webhookUrl } = body;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
  }

  // Generate a webhook secret for HMAC verification
  const webhookSecret = crypto.randomBytes(32).toString("hex");

  try {
    const registeredWebhooks = [];

    // Register each webhook topic
    for (const topic of WEBHOOK_TOPICS) {
      const res = await fetch(
        `https://${connection.store_url}/admin/api/2024-01/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": connection.access_token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookUrl,
              format: "json",
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        registeredWebhooks.push({
          id: data.webhook.id,
          topic: data.webhook.topic,
        });
      } else {
        const errorData = await res.json();
        console.error(`Failed to register webhook for ${topic}:`, errorData);
      }
    }

    // Save webhook secret and status to database
    await admin
      .from("shopify_connections")
      .update({
        webhook_secret: webhookSecret,
        webhooks_enabled: true,
        webhook_url: webhookUrl,
        webhooks_registered: registeredWebhooks,
      })
      .eq("id", connection.id);

    return NextResponse.json({
      success: true,
      webhooksRegistered: registeredWebhooks.length,
      webhookSecret,
    });
  } catch (err) {
    console.error("Webhook registration error:", err);
    return NextResponse.json({ error: "Failed to register webhooks" }, { status: 500 });
  }
}

// DELETE: Unregister webhooks from Shopify
export async function DELETE() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get Shopify connection
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, store_url, access_token, webhooks_registered")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No Shopify connection found" }, { status: 400 });
  }

  try {
    // Delete each registered webhook
    const webhooks = connection.webhooks_registered || [];
    for (const webhook of webhooks) {
      await fetch(
        `https://${connection.store_url}/admin/api/2024-01/webhooks/${webhook.id}.json`,
        {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": connection.access_token,
          },
        }
      );
    }

    // Update database
    await admin
      .from("shopify_connections")
      .update({
        webhook_secret: null,
        webhooks_enabled: false,
        webhook_url: null,
        webhooks_registered: null,
        last_webhook_at: null,
      })
      .eq("id", connection.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook unregistration error:", err);
    return NextResponse.json({ error: "Failed to unregister webhooks" }, { status: 500 });
  }
}

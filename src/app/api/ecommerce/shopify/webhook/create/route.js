import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

const WEBHOOK_TOPICS = [
  "products/create",
  "products/update",
  "products/delete",
  "orders/create",
  "orders/updated",
  "orders/cancelled",
  "orders/fulfilled",
  "orders/paid",
];

export async function POST() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get Shopify connection
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, store_url, access_token, webhook_secret, webhooks_registered")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No Shopify connection found" }, { status: 400 });
  }

  // Get the host from headers
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const webhookUrl = `${protocol}://${host}/api/ecommerce/shopify/webhook`;

  // Generate webhook secret if not exists
  let webhookSecret = connection.webhook_secret;
  if (!webhookSecret) {
    webhookSecret = crypto.randomBytes(32).toString("hex");
  }

  const created = [];
  const failed = [];
  const existingWebhooks = connection.webhooks_registered || [];

  try {
    // First, get existing webhooks from Shopify to avoid duplicates
    const listRes = await fetch(
      `https://${connection.store_url}/admin/api/2024-01/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": connection.access_token,
          "Content-Type": "application/json",
        },
      }
    );

    let existingShopifyWebhooks = [];
    if (listRes.ok) {
      const listData = await listRes.json();
      existingShopifyWebhooks = listData.webhooks || [];
    }

    // Create webhooks for each topic
    for (const topic of WEBHOOK_TOPICS) {
      // Check if webhook already exists for this topic and URL
      const exists = existingShopifyWebhooks.some(
        (wh) => wh.topic === topic && wh.address === webhookUrl
      );

      if (exists) {
        created.push({ topic, status: "already_exists" });
        continue;
      }

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
        created.push({
          id: data.webhook.id,
          topic: data.webhook.topic,
          status: "created",
        });
      } else {
        const errorData = await res.json();
        failed.push({
          topic,
          error: errorData.errors || "Unknown error",
        });
      }
    }

    // Update database with webhook info
    const allWebhooks = [
      ...existingWebhooks.filter((w) => !created.some((c) => c.topic === w.topic)),
      ...created.filter((c) => c.id),
    ];

    await admin
      .from("shopify_connections")
      .update({
        webhook_secret: webhookSecret,
        webhooks_enabled: true,
        webhook_url: webhookUrl,
        webhooks_registered: allWebhooks,
      })
      .eq("id", connection.id);

    return NextResponse.json({
      success: true,
      webhookUrl,
      created,
      failed,
      total: created.length,
    });
  } catch (err) {
    console.error("Create webhooks error:", err);
    return NextResponse.json({ error: "Failed to create webhooks" }, { status: 500 });
  }
}

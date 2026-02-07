import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

const WEBHOOK_TOPICS = [
  "products/create",
  "products/update",
  "products/delete",
  "collections/create",
  "collections/update",
  "collections/delete",
];

/**
 * Register Shopify webhooks for a connected store
 *
 * POST /api/webhooks/shopify/register
 * Body: { shopDomain: string, accessToken: string, webhookUrl?: string }
 */
export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Authenticate user
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

  const { shopDomain, accessToken, webhookUrl } = body;

  if (!shopDomain || !accessToken) {
    return NextResponse.json(
      { error: "shopDomain and accessToken are required" },
      { status: 400 }
    );
  }

  // Normalize shop domain
  const normalizedDomain = shopDomain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");

  // Determine base webhook URL
  const baseUrl = webhookUrl || process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin");

  // Generate webhook secret
  const webhookSecret = crypto.randomBytes(32).toString("hex");

  const registered = [];
  const failed = [];

  try {
    // First, get existing webhooks to avoid duplicates
    const listRes = await fetch(
      `https://${normalizedDomain}/admin/api/2024-01/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    let existingWebhooks = [];
    if (listRes.ok) {
      const listData = await listRes.json();
      existingWebhooks = listData.webhooks || [];
    }

    // Register each topic
    for (const topic of WEBHOOK_TOPICS) {
      // Determine the correct webhook URL based on resource type
      const resource = topic.split("/")[0];
      const fullWebhookUrl = `${baseUrl}/api/webhooks/shopify/${resource}`;

      // Check if webhook already exists for this topic and URL
      const exists = existingWebhooks.find(
        (wh) => wh.topic === topic && wh.address === fullWebhookUrl
      );

      if (exists) {
        registered.push({
          id: exists.id,
          topic,
          status: "already_exists",
        });
        continue;
      }

      // Create new webhook
      const createRes = await fetch(
        `https://${normalizedDomain}/admin/api/2024-01/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: fullWebhookUrl,
              format: "json",
            },
          }),
        }
      );

      if (createRes.ok) {
        const createData = await createRes.json();
        registered.push({
          id: createData.webhook.id,
          topic: createData.webhook.topic,
          status: "created",
        });
      } else {
        const errorData = await createRes.json().catch(() => ({}));
        failed.push({
          topic,
          error: errorData.errors || createRes.statusText,
        });
      }
    }

    // Save connection to database
    const { error: upsertError } = await admin
      .from("shopify_connections")
      .upsert(
        {
          user_id: user.id,
          shop_domain: normalizedDomain,
          access_token: accessToken,
          webhook_secret: webhookSecret,
          webhooks_enabled: true,
          webhook_url: `${baseUrl}/api/webhooks/shopify`,
          webhooks_registered: registered.filter((r) => r.id),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "shop_domain" }
      );

    if (upsertError) {
      console.error("Failed to save connection:", upsertError);
    }

    return NextResponse.json({
      success: true,
      webhookUrl: `${baseUrl}/api/webhooks/shopify`,
      webhookSecret,
      registered,
      failed,
      message: `Registered ${registered.length} webhooks, ${failed.length} failed`,
    });

  } catch (err) {
    console.error("Webhook registration error:", err);
    return NextResponse.json(
      { error: "Failed to register webhooks", message: err.message },
      { status: 500 }
    );
  }
}

/**
 * List registered webhooks for a store
 *
 * GET /api/webhooks/shopify/register?shopDomain=xxx&accessToken=xxx
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shopDomain = searchParams.get("shopDomain");
  const accessToken = searchParams.get("accessToken");

  if (!shopDomain || !accessToken) {
    return NextResponse.json(
      { error: "shopDomain and accessToken are required" },
      { status: 400 }
    );
  }

  const normalizedDomain = shopDomain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");

  try {
    const res = await fetch(
      `https://${normalizedDomain}/admin/api/2024-01/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch webhooks" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ webhooks: data.webhooks || [] });

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/**
 * Delete all registered webhooks
 *
 * DELETE /api/webhooks/shopify/register
 * Body: { shopDomain: string, accessToken: string }
 */
export async function DELETE(request) {
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

  const { shopDomain, accessToken } = body;

  if (!shopDomain || !accessToken) {
    return NextResponse.json(
      { error: "shopDomain and accessToken are required" },
      { status: 400 }
    );
  }

  const normalizedDomain = shopDomain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");

  try {
    // Get all webhooks
    const listRes = await fetch(
      `https://${normalizedDomain}/admin/api/2024-01/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!listRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch webhooks" },
        { status: listRes.status }
      );
    }

    const listData = await listRes.json();
    const webhooks = listData.webhooks || [];

    // Delete each webhook
    const deleted = [];
    for (const webhook of webhooks) {
      const deleteRes = await fetch(
        `https://${normalizedDomain}/admin/api/2024-01/webhooks/${webhook.id}.json`,
        {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );

      if (deleteRes.ok) {
        deleted.push(webhook.id);
      }
    }

    // Update database
    await admin
      .from("shopify_connections")
      .update({
        webhooks_enabled: false,
        webhooks_registered: [],
        updated_at: new Date().toISOString(),
      })
      .eq("shop_domain", normalizedDomain);

    return NextResponse.json({
      success: true,
      deleted: deleted.length,
      message: `Deleted ${deleted.length} webhooks`,
    });

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

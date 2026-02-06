import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Shopify Cart Webhook Handler
 *
 * Handles: carts/create, carts/update
 *
 * Security: HMAC-SHA256 verification using shared secret
 * Idempotency: Uses Shopify cart token + updated_at timestamp
 */

// Verify Shopify webhook signature using HMAC-SHA256
function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) {
    console.log("[Carts Webhook] Missing HMAC header or secret");
    return false;
  }

  const generatedHash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(generatedHash),
      Buffer.from(hmacHeader)
    );
  } catch (err) {
    console.error("[Carts Webhook] HMAC comparison failed:", err.message);
    return false;
  }
}

// Generate idempotency key from cart data
function generateIdempotencyKey(shopDomain, cartToken, updatedAt) {
  return crypto
    .createHash("sha256")
    .update(`${shopDomain}:cart:${cartToken}:${updatedAt}`)
    .digest("hex");
}

// Log webhook event to database
async function logWebhookEvent(admin, eventData) {
  try {
    await admin.from("webhook_logs").insert({
      source: "shopify",
      topic: eventData.topic,
      shop_domain: eventData.shopDomain,
      resource_id: eventData.resourceId,
      status: eventData.status,
      message: eventData.message,
      payload_hash: eventData.payloadHash,
      processing_time_ms: eventData.processingTime,
      webhook_id: eventData.webhookId,
      api_version: eventData.apiVersion,
      raw_payload: eventData.rawPayload,
    });
  } catch (err) {
    console.error("[Carts Webhook] Failed to log event:", err.message);
  }
}

// Parse cart data from Shopify payload
function parseCartData(cart, shopDomain) {
  // Parse line items
  const lineItems = (cart.line_items || []).map((item) => ({
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    title: item.title,
    variant_title: item.variant_title,
    sku: item.sku,
    quantity: item.quantity,
    price: item.price,
    line_price: item.line_price,
    properties: item.properties,
    vendor: item.vendor,
    gift_card: item.gift_card,
    taxable: item.taxable,
    requires_shipping: item.requires_shipping,
  }));

  return {
    shopify_token: cart.token,
    shop_domain: shopDomain,
    note: cart.note,
    attributes: cart.attributes,
    original_total_price: cart.original_total_price,
    total_price: cart.total_price,
    total_discount: cart.total_discount,
    total_weight: cart.total_weight,
    item_count: cart.item_count,
    currency: cart.currency,
    line_items: lineItems,
    line_items_count: lineItems.length,
    requires_shipping: cart.requires_shipping,
    created_at_shopify: cart.created_at,
    updated_at_shopify: cart.updated_at,
    synced_at: new Date().toISOString(),
  };
}

export async function POST(request) {
  const startTime = Date.now();
  const admin = createAdminClient();

  // Get raw body for HMAC verification
  let rawBody;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("[Carts Webhook] Failed to read request body:", err.message);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Extract headers
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const apiVersion = request.headers.get("x-shopify-api-version");

  console.log(`[Carts Webhook] Received: ${topic} from ${shopDomain} (webhook: ${webhookId})`);

  // Validate required headers
  if (!topic || !shopDomain) {
    console.log("[Carts Webhook] Missing required headers");
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  // Verify HMAC signature
  if (webhookSecret) {
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret);
    if (!isValid) {
      console.log("[Carts Webhook] HMAC verification failed");
      await logWebhookEvent(admin, {
        topic,
        shopDomain,
        resourceId: null,
        status: "rejected",
        message: "HMAC verification failed",
        payloadHash: crypto.createHash("md5").update(rawBody).digest("hex"),
        processingTime: Date.now() - startTime,
        webhookId,
        apiVersion,
        rawPayload: rawBody,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[Carts Webhook] HMAC verification passed");
  } else {
    console.warn("[Carts Webhook] No webhook secret configured - skipping HMAC verification");
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[Carts Webhook] Invalid JSON payload:", err.message);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cartToken = payload.token;

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    shopDomain,
    cartToken,
    payload.updated_at || payload.created_at
  );

  // Check for duplicate webhook (idempotency)
  const { data: existingLog } = await admin
    .from("webhook_logs")
    .select("id")
    .eq("payload_hash", idempotencyKey)
    .eq("status", "success")
    .single();

  if (existingLog) {
    console.log(`[Carts Webhook] Duplicate webhook detected, skipping (key: ${idempotencyKey})`);
    return NextResponse.json({ status: "duplicate", message: "Already processed" });
  }

  try {
    // Handle different webhook topics
    switch (topic) {
      case "carts/create":
      case "carts/update": {
        const cartData = parseCartData(payload, shopDomain);

        // Check if cart exists
        const { data: existing } = await admin
          .from("shopify_carts")
          .select("id, updated_at_shopify")
          .eq("shop_domain", shopDomain)
          .eq("shopify_token", cartToken)
          .single();

        if (existing) {
          // Update existing cart
          const { error: updateError } = await admin
            .from("shopify_carts")
            .update(cartData)
            .eq("id", existing.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          console.log(`[Carts Webhook] Updated cart: ${cartToken}`);
        } else {
          // Insert new cart
          const { error: insertError } = await admin
            .from("shopify_carts")
            .insert(cartData);

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          console.log(`[Carts Webhook] Created cart: ${cartToken}`);
        }

        // Log success
        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: cartToken,
          status: "success",
          message: existing ? "Cart updated" : "Cart created",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      default:
        console.log(`[Carts Webhook] Unhandled topic: ${topic}`);
        return NextResponse.json({ status: "ignored", message: "Unhandled topic" });
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Carts Webhook] Completed in ${processingTime}ms`);

    return NextResponse.json({
      status: "success",
      message: "Webhook processed",
      processingTime,
    });

  } catch (err) {
    console.error("[Carts Webhook] Processing error:", err.message);

    await logWebhookEvent(admin, {
      topic,
      shopDomain,
      resourceId: cartToken,
      status: "error",
      message: err.message,
      payloadHash: idempotencyKey,
      processingTime: Date.now() - startTime,
      webhookId,
      apiVersion,
      rawPayload: rawBody,
    });

    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}

// Reject non-POST requests
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

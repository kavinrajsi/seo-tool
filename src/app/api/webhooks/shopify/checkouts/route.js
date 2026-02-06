import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Shopify Checkout Webhook Handler
 *
 * Handles: checkouts/create, checkouts/update, checkouts/delete
 *
 * Security: HMAC-SHA256 verification using shared secret
 * Idempotency: Uses Shopify checkout token + updated_at timestamp
 */

// Verify Shopify webhook signature using HMAC-SHA256
function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) {
    console.log("[Checkouts Webhook] Missing HMAC header or secret");
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
    console.error("[Checkouts Webhook] HMAC comparison failed:", err.message);
    return false;
  }
}

// Generate idempotency key from checkout data
function generateIdempotencyKey(shopDomain, checkoutToken, updatedAt) {
  return crypto
    .createHash("sha256")
    .update(`${shopDomain}:checkout:${checkoutToken}:${updatedAt}`)
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
    console.error("[Checkouts Webhook] Failed to log event:", err.message);
  }
}

// Parse checkout data from Shopify payload
function parseCheckoutData(checkout, shopDomain) {
  // Parse line items
  const lineItems = (checkout.line_items || []).map((item) => ({
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    title: item.title,
    variant_title: item.variant_title,
    sku: item.sku,
    quantity: item.quantity,
    price: item.price,
    line_price: item.line_price,
    compare_at_price: item.compare_at_price,
    fulfillment_service: item.fulfillment_service,
    properties: item.properties,
    vendor: item.vendor,
    requires_shipping: item.requires_shipping,
    taxable: item.taxable,
    gift_card: item.gift_card,
  }));

  // Parse shipping address
  const shippingAddress = checkout.shipping_address ? {
    first_name: checkout.shipping_address.first_name,
    last_name: checkout.shipping_address.last_name,
    address1: checkout.shipping_address.address1,
    address2: checkout.shipping_address.address2,
    city: checkout.shipping_address.city,
    province: checkout.shipping_address.province,
    province_code: checkout.shipping_address.province_code,
    country: checkout.shipping_address.country,
    country_code: checkout.shipping_address.country_code,
    zip: checkout.shipping_address.zip,
    phone: checkout.shipping_address.phone,
    company: checkout.shipping_address.company,
  } : null;

  // Parse billing address
  const billingAddress = checkout.billing_address ? {
    first_name: checkout.billing_address.first_name,
    last_name: checkout.billing_address.last_name,
    address1: checkout.billing_address.address1,
    address2: checkout.billing_address.address2,
    city: checkout.billing_address.city,
    province: checkout.billing_address.province,
    province_code: checkout.billing_address.province_code,
    country: checkout.billing_address.country,
    country_code: checkout.billing_address.country_code,
    zip: checkout.billing_address.zip,
    phone: checkout.billing_address.phone,
    company: checkout.billing_address.company,
  } : null;

  // Parse customer
  const customer = checkout.customer ? {
    id: checkout.customer.id,
    email: checkout.customer.email,
    first_name: checkout.customer.first_name,
    last_name: checkout.customer.last_name,
    phone: checkout.customer.phone,
    accepts_marketing: checkout.customer.accepts_marketing,
  } : null;

  // Parse shipping line
  const shippingLine = checkout.shipping_line ? {
    title: checkout.shipping_line.title,
    price: checkout.shipping_line.price,
    code: checkout.shipping_line.code,
    source: checkout.shipping_line.source,
  } : null;

  return {
    shopify_token: checkout.token,
    shopify_id: String(checkout.id),
    shop_domain: shopDomain,
    cart_token: checkout.cart_token,
    email: checkout.email,
    phone: checkout.phone,
    name: checkout.name,
    note: checkout.note,
    attributes: checkout.note_attributes,

    // Financial
    currency: checkout.currency,
    presentment_currency: checkout.presentment_currency,
    subtotal_price: checkout.subtotal_price,
    total_price: checkout.total_price,
    total_tax: checkout.total_tax,
    total_discounts: checkout.total_discounts,
    total_line_items_price: checkout.total_line_items_price,
    total_weight: checkout.total_weight,

    // Line items
    line_items: lineItems,
    line_items_count: lineItems.length,

    // Addresses
    shipping_address: shippingAddress,
    billing_address: billingAddress,

    // Customer
    customer: customer,
    customer_id: checkout.customer?.id ? String(checkout.customer.id) : null,
    buyer_accepts_marketing: checkout.buyer_accepts_marketing,

    // Shipping
    shipping_line: shippingLine,
    requires_shipping: checkout.requires_shipping,

    // Discounts
    discount_codes: checkout.discount_codes,
    gift_cards: checkout.gift_cards,

    // URLs
    web_url: checkout.web_url,
    abandoned_checkout_url: checkout.abandoned_checkout_url,

    // Status
    completed_at: checkout.completed_at,
    closed_at: checkout.closed_at,

    // Source
    source_name: checkout.source_name,
    source_identifier: checkout.source_identifier,
    source_url: checkout.source_url,
    landing_site: checkout.landing_site,
    referring_site: checkout.referring_site,

    // Timestamps from Shopify
    created_at_shopify: checkout.created_at,
    updated_at_shopify: checkout.updated_at,

    // Sync timestamp
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
    console.error("[Checkouts Webhook] Failed to read request body:", err.message);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Extract headers
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const apiVersion = request.headers.get("x-shopify-api-version");

  console.log(`[Checkouts Webhook] Received: ${topic} from ${shopDomain} (webhook: ${webhookId})`);

  // Validate required headers
  if (!topic || !shopDomain) {
    console.log("[Checkouts Webhook] Missing required headers");
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  // Verify HMAC signature
  if (webhookSecret) {
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret);
    if (!isValid) {
      console.log("[Checkouts Webhook] HMAC verification failed");
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
    console.log("[Checkouts Webhook] HMAC verification passed");
  } else {
    console.warn("[Checkouts Webhook] No webhook secret configured - skipping HMAC verification");
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[Checkouts Webhook] Invalid JSON payload:", err.message);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const checkoutToken = payload.token;
  const checkoutId = payload.id;

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    shopDomain,
    checkoutToken,
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
    console.log(`[Checkouts Webhook] Duplicate webhook detected, skipping (key: ${idempotencyKey})`);
    return NextResponse.json({ status: "duplicate", message: "Already processed" });
  }

  try {
    // Handle different webhook topics
    switch (topic) {
      case "checkouts/create":
      case "checkouts/update": {
        const checkoutData = parseCheckoutData(payload, shopDomain);

        // Check if checkout exists
        const { data: existing } = await admin
          .from("shopify_checkouts")
          .select("id, updated_at_shopify")
          .eq("shop_domain", shopDomain)
          .eq("shopify_token", checkoutToken)
          .single();

        if (existing) {
          // Update existing checkout
          const { error: updateError } = await admin
            .from("shopify_checkouts")
            .update(checkoutData)
            .eq("id", existing.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          console.log(`[Checkouts Webhook] Updated checkout: ${checkoutToken}`);
        } else {
          // Insert new checkout
          const { error: insertError } = await admin
            .from("shopify_checkouts")
            .insert(checkoutData);

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          console.log(`[Checkouts Webhook] Created checkout: ${checkoutToken}`);
        }

        // Log success
        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: checkoutToken,
          status: "success",
          message: existing ? "Checkout updated" : "Checkout created",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      case "checkouts/delete": {
        // Delete checkout
        const { error: deleteError } = await admin
          .from("shopify_checkouts")
          .delete()
          .eq("shop_domain", shopDomain)
          .eq("shopify_token", checkoutToken);

        if (deleteError) {
          throw new Error(`Delete failed: ${deleteError.message}`);
        }

        console.log(`[Checkouts Webhook] Deleted checkout: ${checkoutToken}`);

        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: checkoutToken,
          status: "success",
          message: "Checkout deleted",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      default:
        console.log(`[Checkouts Webhook] Unhandled topic: ${topic}`);
        return NextResponse.json({ status: "ignored", message: "Unhandled topic" });
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Checkouts Webhook] Completed in ${processingTime}ms`);

    return NextResponse.json({
      status: "success",
      message: "Webhook processed",
      processingTime,
    });

  } catch (err) {
    console.error("[Checkouts Webhook] Processing error:", err.message);

    await logWebhookEvent(admin, {
      topic,
      shopDomain,
      resourceId: checkoutToken,
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

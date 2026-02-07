import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Shopify Product Webhook Handler
 *
 * Handles: products/create, products/update, products/delete
 *
 * Security: HMAC-SHA256 verification using shared secret
 * Idempotency: Uses Shopify product ID + updated_at timestamp
 */

// Verify Shopify webhook signature using HMAC-SHA256
function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) {
    console.log("[Products Webhook] Missing HMAC header or secret");
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
    console.error("[Products Webhook] HMAC comparison failed:", err.message);
    return false;
  }
}

// Generate idempotency key from product data
function generateIdempotencyKey(shopDomain, productId, updatedAt) {
  return crypto
    .createHash("sha256")
    .update(`${shopDomain}:product:${productId}:${updatedAt}`)
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
    console.error("[Products Webhook] Failed to log event:", err.message);
  }
}

// Parse product data from Shopify payload
function parseProductData(product, shopDomain) {
  // Parse variants
  const variants = (product.variants || []).map((v) => ({
    id: v.id,
    title: v.title,
    price: v.price,
    compare_at_price: v.compare_at_price,
    sku: v.sku,
    barcode: v.barcode,
    position: v.position,
    inventory_policy: v.inventory_policy,
    inventory_quantity: v.inventory_quantity,
    inventory_management: v.inventory_management,
    inventory_item_id: v.inventory_item_id,
    fulfillment_service: v.fulfillment_service,
    weight: v.weight,
    weight_unit: v.weight_unit,
    grams: v.grams,
    requires_shipping: v.requires_shipping,
    taxable: v.taxable,
    tax_code: v.tax_code,
    option1: v.option1,
    option2: v.option2,
    option3: v.option3,
    image_id: v.image_id,
    created_at: v.created_at,
    updated_at: v.updated_at,
  }));

  // Parse images
  const images = (product.images || []).map((img) => ({
    id: img.id,
    src: img.src,
    alt: img.alt,
    width: img.width,
    height: img.height,
    position: img.position,
    variant_ids: img.variant_ids,
  }));

  // Parse options
  const options = (product.options || []).map((opt) => ({
    id: opt.id,
    name: opt.name,
    position: opt.position,
    values: opt.values,
  }));

  return {
    shopify_id: String(product.id),
    shop_domain: shopDomain,
    title: product.title,
    body_html: product.body_html,
    vendor: product.vendor,
    product_type: product.product_type,
    handle: product.handle,
    status: product.status,
    published_at: product.published_at,
    published_scope: product.published_scope,
    tags: product.tags,
    template_suffix: product.template_suffix,

    // Pricing (from first variant)
    price: product.variants?.[0]?.price || null,
    compare_at_price: product.variants?.[0]?.compare_at_price || null,

    // Primary image URL
    image_url: product.image?.src || product.images?.[0]?.src || null,

    // Variants
    variants: variants,
    variant_count: variants.length,

    // Images
    images: images,

    // Options
    options: options,

    // Inventory
    total_inventory: variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0),

    // Metafields (if included in webhook payload)
    metafields: (product.metafields || []).map((m) => ({
      key: m.key,
      namespace: m.namespace,
      value: m.value,
      type: m.type,
    })),

    // Timestamps from Shopify
    created_at_shopify: product.created_at,
    updated_at_shopify: product.updated_at,

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
    console.error("[Products Webhook] Failed to read request body:", err.message);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Extract headers
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const apiVersion = request.headers.get("x-shopify-api-version");

  console.log(`[Products Webhook] Received: ${topic} from ${shopDomain} (webhook: ${webhookId})`);

  // Validate required headers
  if (!topic || !shopDomain) {
    console.log("[Products Webhook] Missing required headers");
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  // Verify HMAC signature
  if (webhookSecret) {
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret);
    if (!isValid) {
      console.log("[Products Webhook] HMAC verification failed");
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
    console.log("[Products Webhook] HMAC verification passed");
  } else {
    console.warn("[Products Webhook] No webhook secret configured - skipping HMAC verification");
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[Products Webhook] Invalid JSON payload:", err.message);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log full webhook data
  console.log("=== PRODUCTS WEBHOOK DATA ===");
  console.log("Topic:", topic);
  console.log("Shop:", shopDomain);
  console.log("Webhook ID:", webhookId);
  console.log("API Version:", apiVersion);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("=== END WEBHOOK DATA ===");

  const productId = payload.id;

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    shopDomain,
    productId,
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
    console.log(`[Products Webhook] Duplicate webhook detected, skipping (key: ${idempotencyKey})`);
    return NextResponse.json({ status: "duplicate", message: "Already processed" });
  }

  try {
    // Handle different webhook topics
    switch (topic) {
      case "products/create":
      case "products/update": {
        const productData = parseProductData(payload, shopDomain);

        // Check if product exists
        const { data: existing } = await admin
          .from("shopify_products")
          .select("id, updated_at_shopify")
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(productId))
          .single();

        if (existing) {
          // Update existing product
          const { error: updateError } = await admin
            .from("shopify_products")
            .update(productData)
            .eq("id", existing.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          console.log(`[Products Webhook] Updated product: ${productData.title} (${productId})`);
        } else {
          // Insert new product
          const { error: insertError } = await admin
            .from("shopify_products")
            .insert(productData);

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          console.log(`[Products Webhook] Created product: ${productData.title} (${productId})`);
        }

        // Log success
        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(productId),
          status: "success",
          message: existing ? "Product updated" : "Product created",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      case "products/delete": {
        // Delete product
        const { error: deleteError } = await admin
          .from("shopify_products")
          .delete()
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(productId));

        if (deleteError) {
          throw new Error(`Delete failed: ${deleteError.message}`);
        }

        console.log(`[Products Webhook] Deleted product: ${productId}`);

        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(productId),
          status: "success",
          message: "Product deleted",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      default:
        console.log(`[Products Webhook] Unhandled topic: ${topic}`);
        return NextResponse.json({ status: "ignored", message: "Unhandled topic" });
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Products Webhook] Completed in ${processingTime}ms`);

    return NextResponse.json({
      status: "success",
      message: "Webhook processed",
      processingTime,
    });

  } catch (err) {
    console.error("[Products Webhook] Processing error:", err.message);

    await logWebhookEvent(admin, {
      topic,
      shopDomain,
      resourceId: String(productId),
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

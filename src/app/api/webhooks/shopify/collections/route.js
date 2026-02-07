import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Shopify Collection Webhook Handler
 *
 * Handles: collections/create, collections/update, collections/delete
 *
 * Security: HMAC-SHA256 verification using shared secret
 * Idempotency: Uses Shopify collection ID + updated_at timestamp
 */

// Verify Shopify webhook signature using HMAC-SHA256
function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) {
    console.log("[Collections Webhook] Missing HMAC header or secret");
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
    console.error("[Collections Webhook] HMAC comparison failed:", err.message);
    return false;
  }
}

// Generate idempotency key from collection data
function generateIdempotencyKey(shopDomain, collectionId, updatedAt) {
  return crypto
    .createHash("sha256")
    .update(`${shopDomain}:collection:${collectionId}:${updatedAt}`)
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
    console.error("[Collections Webhook] Failed to log event:", err.message);
  }
}

// Parse collection data from Shopify payload
function parseCollectionData(collection, shopDomain) {
  // Parse rules (for smart collections)
  const rules = (collection.rules || []).map((rule) => ({
    column: rule.column,
    relation: rule.relation,
    condition: rule.condition,
  }));

  // Parse image
  const image = collection.image ? {
    src: collection.image.src,
    alt: collection.image.alt,
    width: collection.image.width,
    height: collection.image.height,
    created_at: collection.image.created_at,
  } : null;

  return {
    shopify_id: String(collection.id),
    shop_domain: shopDomain,
    title: collection.title,
    handle: collection.handle,
    body_html: collection.body_html,
    sort_order: collection.sort_order,
    template_suffix: collection.template_suffix,
    published_at: collection.published_at,
    published_scope: collection.published_scope,

    // Collection type (custom_collection or smart_collection)
    collection_type: collection.rules && collection.rules.length > 0 ? "smart" : "custom",
    disjunctive: collection.disjunctive || false,
    rules: rules,

    // Image
    image: image,
    image_url: collection.image?.src || null,

    // Timestamps from Shopify
    created_at_shopify: collection.created_at,
    updated_at_shopify: collection.updated_at,

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
    console.error("[Collections Webhook] Failed to read request body:", err.message);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Extract headers
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const apiVersion = request.headers.get("x-shopify-api-version");

  console.log(`[Collections Webhook] Received: ${topic} from ${shopDomain} (webhook: ${webhookId})`);

  // Validate required headers
  if (!topic || !shopDomain) {
    console.log("[Collections Webhook] Missing required headers");
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  // Verify HMAC signature
  if (webhookSecret) {
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret);
    if (!isValid) {
      console.log("[Collections Webhook] HMAC verification failed");
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
    console.log("[Collections Webhook] HMAC verification passed");
  } else {
    console.warn("[Collections Webhook] No webhook secret configured - skipping HMAC verification");
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[Collections Webhook] Invalid JSON payload:", err.message);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log full webhook data
  console.log("=== COLLECTIONS WEBHOOK DATA ===");
  console.log("Topic:", topic);
  console.log("Shop:", shopDomain);
  console.log("Webhook ID:", webhookId);
  console.log("API Version:", apiVersion);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("=== END WEBHOOK DATA ===");

  const collectionId = payload.id;

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    shopDomain,
    collectionId,
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
    console.log(`[Collections Webhook] Duplicate webhook detected, skipping (key: ${idempotencyKey})`);
    return NextResponse.json({ status: "duplicate", message: "Already processed" });
  }

  try {
    // Handle different webhook topics
    switch (topic) {
      case "collections/create":
      case "collections/update": {
        const collectionData = parseCollectionData(payload, shopDomain);

        // Check if collection exists
        const { data: existing } = await admin
          .from("shopify_collections")
          .select("id, updated_at_shopify")
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(collectionId))
          .single();

        if (existing) {
          // Update existing collection
          const { error: updateError } = await admin
            .from("shopify_collections")
            .update(collectionData)
            .eq("id", existing.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          console.log(`[Collections Webhook] Updated collection: ${collectionData.title} (${collectionId})`);
        } else {
          // Insert new collection
          const { error: insertError } = await admin
            .from("shopify_collections")
            .insert(collectionData);

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          console.log(`[Collections Webhook] Created collection: ${collectionData.title} (${collectionId})`);
        }

        // Log success
        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(collectionId),
          status: "success",
          message: existing ? "Collection updated" : "Collection created",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      case "collections/delete": {
        // Delete collection
        const { error: deleteError } = await admin
          .from("shopify_collections")
          .delete()
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(collectionId));

        if (deleteError) {
          throw new Error(`Delete failed: ${deleteError.message}`);
        }

        console.log(`[Collections Webhook] Deleted collection: ${collectionId}`);

        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(collectionId),
          status: "success",
          message: "Collection deleted",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      default:
        console.log(`[Collections Webhook] Unhandled topic: ${topic}`);
        return NextResponse.json({ status: "ignored", message: "Unhandled topic" });
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Collections Webhook] Completed in ${processingTime}ms`);

    return NextResponse.json({
      status: "success",
      message: "Webhook processed",
      processingTime,
    });

  } catch (err) {
    console.error("[Collections Webhook] Processing error:", err.message);

    await logWebhookEvent(admin, {
      topic,
      shopDomain,
      resourceId: String(collectionId),
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

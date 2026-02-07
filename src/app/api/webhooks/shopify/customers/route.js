import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Shopify Customer Webhook Handler
 *
 * Handles: customers/create, customers/update, customers/delete, customers/enable, customers/disable
 *
 * Security: HMAC-SHA256 verification using shared secret
 * Idempotency: Uses Shopify customer ID + updated_at timestamp
 */

// Verify Shopify webhook signature using HMAC-SHA256
function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) {
    console.log("[Customers Webhook] Missing HMAC header or secret");
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
    console.error("[Customers Webhook] HMAC comparison failed:", err.message);
    return false;
  }
}

// Generate idempotency key from customer data
function generateIdempotencyKey(shopDomain, customerId, updatedAt) {
  return crypto
    .createHash("sha256")
    .update(`${shopDomain}:customer:${customerId}:${updatedAt}`)
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
    console.error("[Customers Webhook] Failed to log event:", err.message);
  }
}

// Parse customer data from Shopify payload
function parseCustomerData(customer, shopDomain) {
  // Parse default address
  const defaultAddress = customer.default_address ? {
    id: customer.default_address.id,
    first_name: customer.default_address.first_name,
    last_name: customer.default_address.last_name,
    address1: customer.default_address.address1,
    address2: customer.default_address.address2,
    city: customer.default_address.city,
    province: customer.default_address.province,
    province_code: customer.default_address.province_code,
    country: customer.default_address.country,
    country_code: customer.default_address.country_code,
    country_name: customer.default_address.country_name,
    zip: customer.default_address.zip,
    phone: customer.default_address.phone,
    company: customer.default_address.company,
    default: customer.default_address.default,
  } : null;

  // Parse all addresses
  const addresses = (customer.addresses || []).map((addr) => ({
    id: addr.id,
    first_name: addr.first_name,
    last_name: addr.last_name,
    address1: addr.address1,
    address2: addr.address2,
    city: addr.city,
    province: addr.province,
    province_code: addr.province_code,
    country: addr.country,
    country_code: addr.country_code,
    country_name: addr.country_name,
    zip: addr.zip,
    phone: addr.phone,
    company: addr.company,
    default: addr.default,
  }));

  return {
    shopify_id: String(customer.id),
    shop_domain: shopDomain,

    // Contact info
    email: customer.email,
    phone: customer.phone,
    first_name: customer.first_name,
    last_name: customer.last_name,

    // Marketing
    accepts_marketing: customer.accepts_marketing,
    accepts_marketing_updated_at: customer.accepts_marketing_updated_at,
    marketing_opt_in_level: customer.marketing_opt_in_level,

    // Order stats
    orders_count: customer.orders_count || 0,
    total_spent: customer.total_spent || "0.00",
    last_order_id: customer.last_order_id ? String(customer.last_order_id) : null,
    last_order_name: customer.last_order_name,

    // Addresses
    default_address: defaultAddress,
    addresses: addresses,
    addresses_count: addresses.length,

    // Account status
    state: customer.state,  // disabled, invited, enabled, declined
    verified_email: customer.verified_email,
    tax_exempt: customer.tax_exempt,
    tax_exemptions: customer.tax_exemptions || [],

    // Metadata
    tags: customer.tags,
    note: customer.note,
    currency: customer.currency,
    multipass_identifier: customer.multipass_identifier,

    // Timestamps from Shopify
    created_at_shopify: customer.created_at,
    updated_at_shopify: customer.updated_at,

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
    console.error("[Customers Webhook] Failed to read request body:", err.message);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Extract headers
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const apiVersion = request.headers.get("x-shopify-api-version");

  console.log(`[Customers Webhook] Received: ${topic} from ${shopDomain} (webhook: ${webhookId})`);

  // Validate required headers
  if (!topic || !shopDomain) {
    console.log("[Customers Webhook] Missing required headers");
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  // Verify HMAC signature
  if (webhookSecret) {
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret);
    if (!isValid) {
      console.log("[Customers Webhook] HMAC verification failed");
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
    console.log("[Customers Webhook] HMAC verification passed");
  } else {
    console.warn("[Customers Webhook] No webhook secret configured - skipping HMAC verification");
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[Customers Webhook] Invalid JSON payload:", err.message);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log full webhook data
  console.log("=== CUSTOMERS WEBHOOK DATA ===");
  console.log("Topic:", topic);
  console.log("Shop:", shopDomain);
  console.log("Webhook ID:", webhookId);
  console.log("API Version:", apiVersion);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("=== END WEBHOOK DATA ===");

  const customerId = payload.id;

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    shopDomain,
    customerId,
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
    console.log(`[Customers Webhook] Duplicate webhook detected, skipping (key: ${idempotencyKey})`);
    return NextResponse.json({ status: "duplicate", message: "Already processed" });
  }

  try {
    // Handle different webhook topics
    switch (topic) {
      case "customers/create":
      case "customers/update":
      case "customers/enable":
      case "customers/disable": {
        const customerData = parseCustomerData(payload, shopDomain);

        // Check if customer exists
        const { data: existing } = await admin
          .from("shopify_customers")
          .select("id, updated_at_shopify")
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(customerId))
          .single();

        if (existing) {
          // Update existing customer
          const { error: updateError } = await admin
            .from("shopify_customers")
            .update(customerData)
            .eq("id", existing.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          console.log(`[Customers Webhook] Updated customer: ${customerData.email} (${customerId})`);
        } else {
          // Insert new customer
          const { error: insertError } = await admin
            .from("shopify_customers")
            .insert(customerData);

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          console.log(`[Customers Webhook] Created customer: ${customerData.email} (${customerId})`);
        }

        // Log success
        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(customerId),
          status: "success",
          message: existing ? "Customer updated" : "Customer created",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      case "customers/delete": {
        // Delete customer
        const { error: deleteError } = await admin
          .from("shopify_customers")
          .delete()
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(customerId));

        if (deleteError) {
          throw new Error(`Delete failed: ${deleteError.message}`);
        }

        console.log(`[Customers Webhook] Deleted customer: ${customerId}`);

        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(customerId),
          status: "success",
          message: "Customer deleted",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      default:
        console.log(`[Customers Webhook] Unhandled topic: ${topic}`);
        return NextResponse.json({ status: "ignored", message: "Unhandled topic" });
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Customers Webhook] Completed in ${processingTime}ms`);

    return NextResponse.json({
      status: "success",
      message: "Webhook processed",
      processingTime,
    });

  } catch (err) {
    console.error("[Customers Webhook] Processing error:", err.message);

    await logWebhookEvent(admin, {
      topic,
      shopDomain,
      resourceId: String(customerId),
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

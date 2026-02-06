import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Shopify Order Webhook Handler
 *
 * Handles: orders/create, orders/updated, orders/cancelled, orders/fulfilled, orders/paid
 *
 * Security: HMAC-SHA256 verification using shared secret
 * Idempotency: Uses Shopify order ID + updated_at timestamp
 */

// Verify Shopify webhook signature using HMAC-SHA256
function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) {
    console.log("[Orders Webhook] Missing HMAC header or secret");
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
    console.error("[Orders Webhook] HMAC comparison failed:", err.message);
    return false;
  }
}

// Generate idempotency key from order data
function generateIdempotencyKey(shopDomain, orderId, updatedAt) {
  return crypto
    .createHash("sha256")
    .update(`${shopDomain}:order:${orderId}:${updatedAt}`)
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
    console.error("[Orders Webhook] Failed to log event:", err.message);
  }
}

// Parse order data from Shopify payload
function parseOrderData(order, shopDomain) {
  // Parse line items
  const lineItems = (order.line_items || []).map((item) => ({
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    title: item.title,
    variant_title: item.variant_title,
    sku: item.sku,
    quantity: item.quantity,
    price: item.price,
    total_discount: item.total_discount,
    fulfillment_status: item.fulfillment_status,
    requires_shipping: item.requires_shipping,
    taxable: item.taxable,
    gift_card: item.gift_card,
    properties: item.properties,
  }));

  // Parse shipping address
  const shippingAddress = order.shipping_address ? {
    first_name: order.shipping_address.first_name,
    last_name: order.shipping_address.last_name,
    address1: order.shipping_address.address1,
    address2: order.shipping_address.address2,
    city: order.shipping_address.city,
    province: order.shipping_address.province,
    province_code: order.shipping_address.province_code,
    country: order.shipping_address.country,
    country_code: order.shipping_address.country_code,
    zip: order.shipping_address.zip,
    phone: order.shipping_address.phone,
    company: order.shipping_address.company,
  } : null;

  // Parse billing address
  const billingAddress = order.billing_address ? {
    first_name: order.billing_address.first_name,
    last_name: order.billing_address.last_name,
    address1: order.billing_address.address1,
    address2: order.billing_address.address2,
    city: order.billing_address.city,
    province: order.billing_address.province,
    province_code: order.billing_address.province_code,
    country: order.billing_address.country,
    country_code: order.billing_address.country_code,
    zip: order.billing_address.zip,
    phone: order.billing_address.phone,
    company: order.billing_address.company,
  } : null;

  // Parse customer
  const customer = order.customer ? {
    id: order.customer.id,
    email: order.customer.email,
    first_name: order.customer.first_name,
    last_name: order.customer.last_name,
    phone: order.customer.phone,
    orders_count: order.customer.orders_count,
    total_spent: order.customer.total_spent,
    tags: order.customer.tags,
    accepts_marketing: order.customer.accepts_marketing,
  } : null;

  // Parse fulfillments
  const fulfillments = (order.fulfillments || []).map((f) => ({
    id: f.id,
    status: f.status,
    tracking_number: f.tracking_number,
    tracking_url: f.tracking_url,
    tracking_company: f.tracking_company,
    shipment_status: f.shipment_status,
    created_at: f.created_at,
    updated_at: f.updated_at,
  }));

  // Parse refunds
  const refunds = (order.refunds || []).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    note: r.note,
    restock: r.restock,
  }));

  return {
    shopify_id: String(order.id),
    shop_domain: shopDomain,
    order_number: order.order_number,
    name: order.name,
    email: order.email,
    phone: order.phone,

    // Financial
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
    currency: order.currency,
    subtotal_price: order.subtotal_price,
    total_price: order.total_price,
    total_tax: order.total_tax,
    total_discounts: order.total_discounts,
    total_shipping: order.total_shipping_price_set?.shop_money?.amount || null,
    total_weight: order.total_weight,

    // Items
    line_items: lineItems,
    line_items_count: lineItems.length,

    // Addresses
    shipping_address: shippingAddress,
    billing_address: billingAddress,

    // Customer
    customer: customer,
    customer_id: order.customer?.id ? String(order.customer.id) : null,

    // Fulfillment
    fulfillments: fulfillments,
    refunds: refunds,

    // Additional info
    note: order.note,
    tags: order.tags,
    source_name: order.source_name,
    landing_site: order.landing_site,
    referring_site: order.referring_site,
    discount_codes: order.discount_codes,

    // Risk
    buyer_accepts_marketing: order.buyer_accepts_marketing,

    // Timestamps from Shopify
    created_at_shopify: order.created_at,
    updated_at_shopify: order.updated_at,
    processed_at: order.processed_at,
    closed_at: order.closed_at,
    cancelled_at: order.cancelled_at,

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
    console.error("[Orders Webhook] Failed to read request body:", err.message);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Extract headers
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const apiVersion = request.headers.get("x-shopify-api-version");

  console.log(`[Orders Webhook] Received: ${topic} from ${shopDomain} (webhook: ${webhookId})`);

  // Validate required headers
  if (!topic || !shopDomain) {
    console.log("[Orders Webhook] Missing required headers");
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  // Verify HMAC signature
  if (webhookSecret) {
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret);
    if (!isValid) {
      console.log("[Orders Webhook] HMAC verification failed");
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
    console.log("[Orders Webhook] HMAC verification passed");
  } else {
    console.warn("[Orders Webhook] No webhook secret configured - skipping HMAC verification");
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[Orders Webhook] Invalid JSON payload:", err.message);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = payload.id;

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    shopDomain,
    orderId,
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
    console.log(`[Orders Webhook] Duplicate webhook detected, skipping (key: ${idempotencyKey})`);
    return NextResponse.json({ status: "duplicate", message: "Already processed" });
  }

  try {
    // Handle different webhook topics
    switch (topic) {
      case "orders/create":
      case "orders/updated":
      case "orders/paid":
      case "orders/fulfilled": {
        const orderData = parseOrderData(payload, shopDomain);

        // Check if order exists
        const { data: existing } = await admin
          .from("shopify_orders")
          .select("id, updated_at_shopify")
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(orderId))
          .single();

        if (existing) {
          // Update existing order
          const { error: updateError } = await admin
            .from("shopify_orders")
            .update(orderData)
            .eq("id", existing.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          console.log(`[Orders Webhook] Updated order: ${orderData.name} (${orderId})`);
        } else {
          // Insert new order
          const { error: insertError } = await admin
            .from("shopify_orders")
            .insert(orderData);

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          console.log(`[Orders Webhook] Created order: ${orderData.name} (${orderId})`);
        }

        // Log success
        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(orderId),
          status: "success",
          message: existing ? "Order updated" : "Order created",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      case "orders/cancelled": {
        // Update order status to cancelled
        const { error: cancelError } = await admin
          .from("shopify_orders")
          .update({
            cancelled_at: payload.cancelled_at || new Date().toISOString(),
            financial_status: "cancelled",
            updated_at_shopify: payload.updated_at,
            synced_at: new Date().toISOString(),
          })
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(orderId));

        if (cancelError) {
          throw new Error(`Cancel update failed: ${cancelError.message}`);
        }

        console.log(`[Orders Webhook] Cancelled order: ${orderId}`);

        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(orderId),
          status: "success",
          message: "Order cancelled",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      case "orders/delete": {
        // Soft delete or hard delete based on preference
        const { error: deleteError } = await admin
          .from("shopify_orders")
          .delete()
          .eq("shop_domain", shopDomain)
          .eq("shopify_id", String(orderId));

        if (deleteError) {
          throw new Error(`Delete failed: ${deleteError.message}`);
        }

        console.log(`[Orders Webhook] Deleted order: ${orderId}`);

        await logWebhookEvent(admin, {
          topic,
          shopDomain,
          resourceId: String(orderId),
          status: "success",
          message: "Order deleted",
          payloadHash: idempotencyKey,
          processingTime: Date.now() - startTime,
          webhookId,
          apiVersion,
          rawPayload: rawBody,
        });

        break;
      }

      default:
        console.log(`[Orders Webhook] Unhandled topic: ${topic}`);
        return NextResponse.json({ status: "ignored", message: "Unhandled topic" });
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Orders Webhook] Completed in ${processingTime}ms`);

    return NextResponse.json({
      status: "success",
      message: "Webhook processed",
      processingTime,
    });

  } catch (err) {
    console.error("[Orders Webhook] Processing error:", err.message);

    await logWebhookEvent(admin, {
      topic,
      shopDomain,
      resourceId: String(orderId),
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

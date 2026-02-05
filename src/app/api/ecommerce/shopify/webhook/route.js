import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Verify Shopify webhook signature
function verifyWebhook(body, hmacHeader, secret) {
  if (!hmacHeader || !secret) return false;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

export async function POST(request) {
  const admin = createAdminClient();

  // Get raw body for HMAC verification
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  if (!topic || !shopDomain) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  // Find the connection for this shop
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, user_id, webhook_secret")
    .eq("store_url", shopDomain.replace("https://", "").replace("/", ""))
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Unknown shop" }, { status: 404 });
  }

  // Verify webhook signature if secret is set
  if (connection.webhook_secret) {
    const isValid = verifyWebhook(rawBody, hmacHeader, connection.webhook_secret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // Parse the webhook payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = connection.user_id;

  // Handle different webhook topics
  switch (topic) {
    case "products/create":
    case "products/update":
      await upsertProduct(admin, userId, payload);
      break;

    case "products/delete":
      await deleteProduct(admin, userId, payload.id);
      break;

    case "orders/create":
    case "orders/updated":
      await upsertOrder(admin, userId, payload);
      break;

    case "orders/cancelled":
      await updateOrderStatus(admin, userId, payload.id, "cancelled");
      break;

    case "orders/fulfilled":
      await updateOrderStatus(admin, userId, payload.id, "fulfilled");
      break;

    case "orders/paid":
      await updateOrderStatus(admin, userId, payload.id, "paid");
      break;

    default:
      // Ignore other topics
      break;
  }

  // Update last webhook received timestamp
  await admin
    .from("shopify_connections")
    .update({ last_webhook_at: new Date().toISOString() })
    .eq("id", connection.id);

  return NextResponse.json({ success: true });
}

async function upsertProduct(admin, userId, product) {
  const productData = {
    user_id: userId,
    shopify_id: String(product.id),
    title: product.title,
    vendor: product.vendor || null,
    product_type: product.product_type || null,
    status: product.status || "active",
    handle: product.handle,
    image_url: product.image?.src || (product.images?.[0]?.src) || null,
    price: product.variants?.[0]?.price || null,
    compare_at_price: product.variants?.[0]?.compare_at_price || null,
    variant_count: product.variants?.length || 0,
    tags: product.tags || null,
    created_at_shopify: product.created_at,
    updated_at_shopify: product.updated_at,
    synced_at: new Date().toISOString(),
  };

  // Check if product exists
  const { data: existing } = await admin
    .from("shopify_products")
    .select("id")
    .eq("user_id", userId)
    .eq("shopify_id", String(product.id))
    .single();

  if (existing) {
    await admin
      .from("shopify_products")
      .update(productData)
      .eq("id", existing.id);
  } else {
    await admin.from("shopify_products").insert(productData);
  }
}

async function deleteProduct(admin, userId, shopifyId) {
  await admin
    .from("shopify_products")
    .delete()
    .eq("user_id", userId)
    .eq("shopify_id", String(shopifyId));
}

async function upsertOrder(admin, userId, order) {
  const orderData = {
    user_id: userId,
    shopify_id: String(order.id),
    order_number: order.order_number || order.name,
    name: order.name,
    email: order.email || null,
    phone: order.phone || null,
    financial_status: order.financial_status || "pending",
    fulfillment_status: order.fulfillment_status || "unfulfilled",
    currency: order.currency || "USD",
    total_price: order.total_price || "0.00",
    subtotal_price: order.subtotal_price || "0.00",
    total_tax: order.total_tax || "0.00",
    total_discounts: order.total_discounts || "0.00",
    total_shipping: order.total_shipping_price_set?.shop_money?.amount || "0.00",
    line_items_count: order.line_items?.length || 0,
    line_items: order.line_items || [],
    shipping_address: order.shipping_address || null,
    billing_address: order.billing_address || null,
    customer: order.customer ? {
      id: order.customer.id,
      email: order.customer.email,
      first_name: order.customer.first_name,
      last_name: order.customer.last_name,
    } : null,
    tags: order.tags || null,
    note: order.note || null,
    cancelled_at: order.cancelled_at || null,
    created_at_shopify: order.created_at,
    updated_at_shopify: order.updated_at,
    synced_at: new Date().toISOString(),
  };

  // Check if order exists
  const { data: existing } = await admin
    .from("shopify_orders")
    .select("id")
    .eq("user_id", userId)
    .eq("shopify_id", String(order.id))
    .single();

  if (existing) {
    await admin
      .from("shopify_orders")
      .update(orderData)
      .eq("id", existing.id);
  } else {
    await admin.from("shopify_orders").insert(orderData);
  }
}

async function updateOrderStatus(admin, userId, shopifyId, status) {
  const updateData = {
    synced_at: new Date().toISOString(),
  };

  if (status === "cancelled") {
    updateData.cancelled_at = new Date().toISOString();
    updateData.financial_status = "refunded";
  } else if (status === "fulfilled") {
    updateData.fulfillment_status = "fulfilled";
  } else if (status === "paid") {
    updateData.financial_status = "paid";
  }

  await admin
    .from("shopify_orders")
    .update(updateData)
    .eq("user_id", userId)
    .eq("shopify_id", String(shopifyId));
}

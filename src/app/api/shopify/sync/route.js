import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

async function shopifyFetch(shop, token, endpoint) {
  const res = await fetch(`https://${shop}/admin/api/2024-01/${endpoint}`, {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchAllPages(shop, token, endpoint, key) {
  const allItems = [];
  const separator = endpoint.includes("?") ? "&" : "?";
  let url = `https://${shop}/admin/api/2024-01/${endpoint}${separator}limit=250`;

  while (url) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    });
    if (!res.ok) break;
    const data = await res.json();
    allItems.push(...(data[key] || []));

    // Pagination via Link header
    const linkHeader = res.headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
  }
  return allItems;
}

export async function POST(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { type } = await req.json(); // "products" or "orders"

    const { data: config } = await supabase
      .from("shopify_config")
      .select("shop_domain, access_token")
      .eq("user_id", user.id)
      .single();

    if (!config) {
      return NextResponse.json({ error: "Shopify not connected" }, { status: 400 });
    }

    const { shop_domain, access_token } = config;
    const now = new Date().toISOString();

    if (type === "products") {
      const products = await fetchAllPages(shop_domain, access_token, "products.json", "products");

      const rows = products.map((p) => ({
        user_id: user.id,
        product_name: p.title || "",
        sku: p.variants?.[0]?.sku || "",
        price: Number(p.variants?.[0]?.price) || 0,
        compare_at_price: Number(p.variants?.[0]?.compare_at_price) || 0,
        currency: "INR",
        category: p.product_type || "",
        status: p.status || "active",
        inventory_count: p.variants?.reduce((s, v) => s + (v.inventory_quantity || 0), 0) || 0,
        vendor: p.vendor || "",
        product_type: p.product_type || "",
        image_url: p.image?.src || p.images?.[0]?.src || "",
        description: (p.body_html || "").replace(/<[^>]*>/g, "").slice(0, 500),
        tags: p.tags ? p.tags.split(", ").filter(Boolean) : [],
        shopify_url: `https://${shop_domain}/admin/products/${p.id}`,
        updated_at: now,
      }));

      // Clear existing and insert fresh
      await supabase.from("shopify_products").delete().eq("user_id", user.id);
      for (let i = 0; i < rows.length; i += 50) {
        await supabase.from("shopify_products").insert(rows.slice(i, i + 50));
      }

      return NextResponse.json({ synced: rows.length, type: "products" });
    }

    if (type === "orders") {
      const orders = await fetchAllPages(shop_domain, access_token, "orders.json?status=any", "orders");

      const rows = orders.map((o) => ({
        user_id: user.id,
        order_number: o.name || `#${o.order_number}`,
        customer_name: o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : "",
        customer_email: o.customer?.email || o.email || "",
        customer_phone: o.customer?.phone || o.phone || "",
        total_amount: Number(o.total_price) || 0,
        currency: o.currency || "INR",
        status: mapShopifyStatus(o.fulfillment_status, o.cancelled_at),
        payment_status: mapPaymentStatus(o.financial_status),
        items: (o.line_items || []).map((li) => ({ name: li.title, quantity: li.quantity, price: li.price })),
        shipping_address: o.shipping_address ? `${o.shipping_address.address1 || ""}, ${o.shipping_address.city || ""}, ${o.shipping_address.province || ""} ${o.shipping_address.zip || ""}`.trim() : "",
        tracking_number: o.fulfillments?.[0]?.tracking_number || "",
        notes: o.note || "",
        order_date: o.created_at || now,
        updated_at: now,
      }));

      await supabase.from("shopify_orders").delete().eq("user_id", user.id);
      for (let i = 0; i < rows.length; i += 50) {
        await supabase.from("shopify_orders").insert(rows.slice(i, i + 50));
      }

      return NextResponse.json({ synced: rows.length, type: "orders" });
    }

    return NextResponse.json({ error: "Invalid type. Use 'products' or 'orders'" }, { status: 400 });
  } catch (err) {
    logError("shopify/sync", err);
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 });
  }
}

function mapShopifyStatus(fulfillment, cancelled) {
  if (cancelled) return "cancelled";
  if (!fulfillment) return "pending";
  if (fulfillment === "fulfilled") return "delivered";
  if (fulfillment === "partial") return "shipped";
  return "processing";
}

function mapPaymentStatus(financial) {
  if (financial === "paid") return "paid";
  if (financial === "refunded") return "refunded";
  if (financial === "partially_refunded" || financial === "partially_paid") return "partial";
  return "unpaid";
}

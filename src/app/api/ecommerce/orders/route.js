import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get user's Shopify connections to find their shop domains
  const { data: connections } = await admin
    .from("shopify_connections")
    .select("shop_domain")
    .eq("user_id", user.id);

  const shopDomains = (connections || []).map((c) => c.shop_domain);

  // Fetch from shopify_orders
  let shopifyQuery = admin
    .from("shopify_orders")
    .select("*")
    .order("created_at_shopify", { ascending: false });

  // Filter by shop domains if user has connections
  if (shopDomains.length > 0) {
    shopifyQuery = shopifyQuery.in("shop_domain", shopDomains);
  }

  const { data: shopifyOrders } = await shopifyQuery;

  // Map shopify_orders fields to match expected format
  const orders = (shopifyOrders || []).map((o) => ({
    id: o.id,
    order_number: o.name || `#${o.order_number}`,
    customer_email: o.email,
    customer_name: o.customer?.first_name
      ? `${o.customer.first_name} ${o.customer.last_name || ""}`.trim()
      : o.email,
    status: o.fulfillment_status || "unfulfilled",
    financial_status: o.financial_status,
    total_price: o.total_price,
    subtotal_price: o.subtotal_price,
    total_tax: o.total_tax,
    total_discounts: o.total_discounts,
    currency: o.currency,
    shipping_address: o.shipping_address,
    billing_address: o.billing_address,
    line_items: o.line_items,
    line_items_count: o.line_items_count,
    note: o.note,
    tags: o.tags,
    shopify_id: o.shopify_id,
    shop_domain: o.shop_domain,
    created_at: o.created_at_shopify || o.created_at,
    updated_at: o.updated_at_shopify || o.updated_at,
    source: "shopify",
  }));

  // Debug info
  console.log("[Orders API] User:", user.id);
  console.log("[Orders API] Shop domains:", shopDomains);
  console.log("[Orders API] Orders count:", orders.length);

  return NextResponse.json({
    orders,
    _debug: {
      userId: user.id,
      shopDomains,
      count: orders.length,
    }
  });
}

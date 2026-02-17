import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch the user's connected Shopify store
  const { data: shopifyConn } = await admin
    .from("shopify_connection")
    .select("shop_domain")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!shopifyConn) {
    return NextResponse.json({ orders: [], _debug: { userId: user.id, count: 0 } });
  }

  // Fetch from shopify_orders
  const { data: shopifyOrders } = await admin
    .from("shopify_orders")
    .select("*")
    .eq("shop_domain", shopifyConn.shop_domain)
    .order("created_at_shopify", { ascending: false });

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
    fulfillments: o.fulfillments || [],
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
  console.log("[Orders API] Orders count:", orders.length);

  return NextResponse.json({
    orders,
    _debug: {
      userId: user.id,
      count: orders.length,
    }
  });
}

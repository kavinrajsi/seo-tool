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
    return NextResponse.json({ orders: 0, customers: 0, carts: 0, checkouts: 0 });
  }

  try {
    // Build queries filtered by the user's shop domain
    const [ordersRes, customersRes, cartsRes, checkoutsRes] = await Promise.all([
      admin.from("shopify_orders").select("id", { count: "exact", head: true }).eq("shop_domain", shopifyConn.shop_domain),
      admin.from("shopify_customers").select("id", { count: "exact", head: true }).eq("shop_domain", shopifyConn.shop_domain),
      admin.from("shopify_carts").select("id", { count: "exact", head: true }).eq("shop_domain", shopifyConn.shop_domain),
      admin.from("shopify_checkouts").select("id", { count: "exact", head: true }).eq("shop_domain", shopifyConn.shop_domain),
    ]);

    return NextResponse.json({
      orders: ordersRes.count || 0,
      customers: customersRes.count || 0,
      carts: cartsRes.count || 0,
      checkouts: checkoutsRes.count || 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({
      orders: 0,
      customers: 0,
      carts: 0,
      checkouts: 0,
    });
  }
}

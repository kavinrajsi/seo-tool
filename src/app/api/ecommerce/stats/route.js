import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getProjectShopDomains } from "@/lib/projectConnections";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";
  const shopDomains = await getProjectShopDomains(user.id, projectId);

  try {
    // Build queries with shop domain filter
    let ordersQuery = admin.from("shopify_orders").select("id", { count: "exact", head: true });
    let customersQuery = admin.from("shopify_customers").select("id", { count: "exact", head: true });
    let cartsQuery = admin.from("shopify_carts").select("id", { count: "exact", head: true });
    let checkoutsQuery = admin.from("shopify_checkouts").select("id", { count: "exact", head: true });

    if (shopDomains.length > 0) {
      ordersQuery = ordersQuery.in("shop_domain", shopDomains);
      customersQuery = customersQuery.in("shop_domain", shopDomains);
      cartsQuery = cartsQuery.in("shop_domain", shopDomains);
      checkoutsQuery = checkoutsQuery.in("shop_domain", shopDomains);
    }

    const [ordersRes, customersRes, cartsRes, checkoutsRes] = await Promise.all([
      ordersQuery,
      customersQuery,
      cartsQuery,
      checkoutsQuery,
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

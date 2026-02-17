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
    return NextResponse.json({ products: [], stats: { totalProducts: 0, activeProducts: 0, draftProducts: 0, archivedProducts: 0, totalInventory: 0 } });
  }

  // Fetch products
  const { data: products, error } = await admin
    .from("shopify_products")
    .select("*")
    .eq("shop_domain", shopifyConn.shop_domain)
    .order("updated_at_shopify", { ascending: false });

  if (error) {
    console.error("[Products API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats
  const totalProducts = products?.length || 0;
  const activeProducts = products?.filter(p => p.status === "active")?.length || 0;
  const draftProducts = products?.filter(p => p.status === "draft")?.length || 0;
  const archivedProducts = products?.filter(p => p.status === "archived")?.length || 0;
  const totalInventory = products?.reduce((sum, p) => sum + (p.total_inventory || 0), 0) || 0;

  return NextResponse.json({
    products: products || [],
    stats: {
      totalProducts,
      activeProducts,
      draftProducts,
      archivedProducts,
      totalInventory,
    },
  });
}

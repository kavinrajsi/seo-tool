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

  // Fetch products
  let query = admin
    .from("shopify_products")
    .select("*")
    .order("updated_at_shopify", { ascending: false });

  if (shopDomains.length > 0) {
    query = query.in("shop_domain", shopDomains);
  }

  const { data: products, error } = await query;

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

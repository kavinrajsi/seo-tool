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

  // Fetch carts
  let query = admin
    .from("shopify_carts")
    .select("*")
    .order("updated_at_shopify", { ascending: false });

  // Filter by shop domains if user has connections
  if (shopDomains.length > 0) {
    query = query.in("shop_domain", shopDomains);
  }

  const { data: carts, error } = await query;

  if (error) {
    console.error("[Carts API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats
  const totalCarts = carts?.length || 0;
  const totalItems = carts?.reduce((sum, c) => sum + (c.item_count || 0), 0) || 0;
  const totalValue = carts?.reduce((sum, c) => sum + parseFloat(c.total_price || 0), 0) || 0;
  const avgCartValue = totalCarts > 0 ? totalValue / totalCarts : 0;

  return NextResponse.json({
    carts: carts || [],
    stats: {
      totalCarts,
      totalItems,
      totalValue: totalValue.toFixed(2),
      avgCartValue: avgCartValue.toFixed(2),
    },
    _debug: {
      userId: user.id,
      shopDomains,
      count: totalCarts,
    }
  });
}

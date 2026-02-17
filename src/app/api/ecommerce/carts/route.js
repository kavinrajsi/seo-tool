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
    return NextResponse.json({ carts: [], stats: { totalCarts: 0, totalItems: 0, totalValue: "0.00", avgCartValue: "0.00" }, _debug: { userId: user.id, count: 0 } });
  }

  // Fetch carts
  const { data: carts, error } = await admin
    .from("shopify_carts")
    .select("*")
    .eq("shop_domain", shopifyConn.shop_domain)
    .order("updated_at_shopify", { ascending: false });

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
      count: totalCarts,
    }
  });
}

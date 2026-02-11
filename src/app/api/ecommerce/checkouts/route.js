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

  // Fetch checkouts
  let query = admin
    .from("shopify_checkouts")
    .select("*")
    .order("created_at_shopify", { ascending: false });

  // Filter by shop domains if user has connections
  if (shopDomains.length > 0) {
    query = query.in("shop_domain", shopDomains);
  }

  const { data: checkouts, error } = await query;

  if (error) {
    console.error("[Checkouts API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats
  const totalCheckouts = checkouts?.length || 0;
  const abandonedCheckouts = checkouts?.filter(c => !c.completed_at)?.length || 0;
  const completedCheckouts = checkouts?.filter(c => c.completed_at)?.length || 0;
  const totalValue = checkouts?.reduce((sum, c) => sum + parseFloat(c.total_price || 0), 0) || 0;

  return NextResponse.json({
    checkouts: checkouts || [],
    stats: {
      total: totalCheckouts,
      abandoned: abandonedCheckouts,
      completed: completedCheckouts,
      totalValue: totalValue.toFixed(2),
    },
    _debug: {
      userId: user.id,
      shopDomains,
      count: totalCheckouts,
    }
  });
}

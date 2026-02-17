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
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  let connQuery = admin
    .from("shopify_connections")
    .select("shop_domain")
    .eq("user_id", user.id);
  if (projectId) {
    connQuery = connQuery.eq("project_id", projectId);
  } else {
    connQuery = connQuery.is("project_id", null);
  }
  const { data: shopifyConn } = await connQuery.maybeSingle();

  if (!shopifyConn) {
    return NextResponse.json({ checkouts: [], stats: { total: 0, abandoned: 0, completed: 0, totalValue: "0.00" }, _debug: { userId: user.id, count: 0 } });
  }

  // Fetch checkouts
  const { data: checkouts, error } = await admin
    .from("shopify_checkouts")
    .select("*")
    .eq("shop_domain", shopifyConn.shop_domain)
    .order("created_at_shopify", { ascending: false });

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
      count: totalCheckouts,
    }
  });
}

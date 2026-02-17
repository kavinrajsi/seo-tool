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
    return NextResponse.json({ customers: [], stats: { totalCustomers: 0, acceptsMarketing: 0, verifiedEmail: 0, totalSpent: "0.00", totalOrders: 0 }, _debug: { userId: user.id, count: 0 } });
  }

  // Fetch customers
  const { data: customers, error } = await admin
    .from("shopify_customers")
    .select("*")
    .eq("shop_domain", shopifyConn.shop_domain)
    .order("created_at_shopify", { ascending: false });

  if (error) {
    console.error("[Customers API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats
  const totalCustomers = customers?.length || 0;
  const acceptsMarketing = customers?.filter(c => c.accepts_marketing)?.length || 0;
  const verifiedEmail = customers?.filter(c => c.verified_email)?.length || 0;
  const totalSpent = customers?.reduce((sum, c) => sum + parseFloat(c.total_spent || 0), 0) || 0;
  const totalOrders = customers?.reduce((sum, c) => sum + (c.orders_count || 0), 0) || 0;

  return NextResponse.json({
    customers: customers || [],
    stats: {
      totalCustomers,
      acceptsMarketing,
      verifiedEmail,
      totalSpent: totalSpent.toFixed(2),
      totalOrders,
    },
    _debug: {
      userId: user.id,
      count: totalCustomers,
    }
  });
}

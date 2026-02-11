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

  // Fetch customers
  let query = admin
    .from("shopify_customers")
    .select("*")
    .order("created_at_shopify", { ascending: false });

  // Filter by shop domains if user has connections
  if (shopDomains.length > 0) {
    query = query.in("shop_domain", shopDomains);
  }

  const { data: customers, error } = await query;

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
      shopDomains,
      count: totalCustomers,
    }
  });
}

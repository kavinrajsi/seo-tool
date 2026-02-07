import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Get user's Shopify connections
  const { data: connections } = await admin
    .from("shopify_connections")
    .select("shop_domain")
    .eq("user_id", user.id);

  const shopDomains = (connections || []).map((c) => c.shop_domain);

  // Fetch single product
  let query = admin
    .from("shopify_products")
    .select("*")
    .eq("id", id)
    .single();

  const { data: product, error } = await query;

  if (error || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Verify user has access to this product's shop
  if (shopDomains.length > 0 && !shopDomains.includes(product.shop_domain)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ product });
}

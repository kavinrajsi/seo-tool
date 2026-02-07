import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get user's Shopify connections to find their shop domains
  const { data: connections } = await admin
    .from("shopify_connections")
    .select("shop_domain")
    .eq("user_id", user.id);

  const shopDomains = (connections || []).map((c) => c.shop_domain);

  // Fetch collections
  let query = admin
    .from("shopify_collections")
    .select("*")
    .order("updated_at_shopify", { ascending: false });

  if (shopDomains.length > 0) {
    query = query.in("shop_domain", shopDomains);
  }

  const { data: collections, error } = await query;

  if (error) {
    console.error("[Collections API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats
  const totalCollections = collections?.length || 0;
  const smartCollections = collections?.filter(c => c.collection_type === "smart")?.length || 0;
  const customCollections = collections?.filter(c => c.collection_type === "custom")?.length || 0;

  return NextResponse.json({
    collections: collections || [],
    stats: {
      totalCollections,
      smartCollections,
      customCollections,
    },
  });
}

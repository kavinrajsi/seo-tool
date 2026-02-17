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
    return NextResponse.json({ collections: [], stats: { totalCollections: 0, smartCollections: 0, customCollections: 0 } });
  }

  // Fetch collections
  const { data: collections, error } = await admin
    .from("shopify_collections")
    .select("*")
    .eq("shop_domain", shopifyConn.shop_domain)
    .order("updated_at_shopify", { ascending: false });

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

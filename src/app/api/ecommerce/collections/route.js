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

  const { data: collections, error } = await admin
    .from("ecommerce_collections")
    .select("*, ecommerce_collection_products(product_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add product count to each collection
  const collectionsWithCount = (collections || []).map((c) => ({
    ...c,
    product_count: c.ecommerce_collection_products?.length || 0,
    ecommerce_collection_products: undefined,
  }));

  return NextResponse.json({ collections: collectionsWithCount });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, product_ids } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Create collection
  const { data: collection, error } = await admin
    .from("ecommerce_collections")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add products to collection
  if (product_ids && product_ids.length > 0) {
    const productLinks = product_ids.map((productId) => ({
      collection_id: collection.id,
      product_id: productId,
    }));

    await admin.from("ecommerce_collection_products").insert(productLinks);
  }

  return NextResponse.json({ collection });
}

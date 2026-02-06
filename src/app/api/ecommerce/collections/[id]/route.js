import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: collection, error } = await admin
    .from("ecommerce_collections")
    .select("*, ecommerce_collection_products(product_id, ecommerce_products(*))")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ collection });
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

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

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;

  if (Object.keys(updates).length > 0) {
    const { error } = await admin
      .from("ecommerce_collections")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update product associations if provided
  if (product_ids !== undefined) {
    // Remove existing associations
    await admin.from("ecommerce_collection_products").delete().eq("collection_id", id);

    // Add new associations
    if (product_ids.length > 0) {
      const productLinks = product_ids.map((productId) => ({
        collection_id: id,
        product_id: productId,
      }));

      await admin.from("ecommerce_collection_products").insert(productLinks);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Delete product associations first
  await admin.from("ecommerce_collection_products").delete().eq("collection_id", id);

  // Delete collection
  const { error } = await admin
    .from("ecommerce_collections")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

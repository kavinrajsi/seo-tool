import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get Shopify connection
  const { data: connection, error: connError } = await admin
    .from("shopify_connections")
    .select("id, store_url, access_token, webhook_only")
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ error: "No Shopify connection found" }, { status: 400 });
  }

  // Check if this is a webhook-only connection
  if (connection.webhook_only || !connection.access_token) {
    return NextResponse.json({
      error: "Cannot sync manually. This is a webhook-only connection. Products will sync automatically when updated in Shopify."
    }, { status: 400 });
  }

  try {
    // Fetch products from Shopify
    const productsRes = await fetch(
      `https://${connection.store_url}/admin/api/2024-01/products.json?limit=250`,
      {
        headers: {
          "X-Shopify-Access-Token": connection.access_token,
          "Content-Type": "application/json",
        },
      }
    );

    if (!productsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch products from Shopify" }, { status: 500 });
    }

    const productsData = await productsRes.json();
    const products = productsData.products || [];

    // Clear existing products for this user
    await admin
      .from("shopify_products")
      .delete()
      .eq("user_id", user.id);

    // Insert new products
    if (products.length > 0) {
      const productRows = products.map((p) => ({
        user_id: user.id,
        shopify_id: String(p.id),
        title: p.title,
        vendor: p.vendor || null,
        product_type: p.product_type || null,
        status: p.status || "active",
        handle: p.handle,
        image_url: p.image?.src || (p.images?.[0]?.src) || null,
        price: p.variants?.[0]?.price || null,
        compare_at_price: p.variants?.[0]?.compare_at_price || null,
        variant_count: p.variants?.length || 0,
        tags: p.tags || null,
        created_at_shopify: p.created_at,
        updated_at_shopify: p.updated_at,
      }));

      const { error: insertError } = await admin
        .from("shopify_products")
        .insert(productRows);

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    // Update last synced timestamp
    await admin
      .from("shopify_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      productCount: products.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: err.message || "Failed to sync products" }, { status: 500 });
  }
}

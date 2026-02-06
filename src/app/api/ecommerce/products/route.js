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

  // Fetch products from both tables
  let allProducts = [];

  // 1. Fetch from ecommerce_products (manually added products)
  const { data: ecommerceProducts } = await admin
    .from("ecommerce_products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (ecommerceProducts) {
    allProducts = [...ecommerceProducts.map((p) => ({ ...p, source: "manual" }))];
  }

  // 2. Fetch from shopify_products (webhook products)
  let shopifyQuery = admin
    .from("shopify_products")
    .select("*")
    .order("updated_at", { ascending: false });

  // If user has connections, filter by their shop domains
  // Otherwise, fetch all shopify products (for single-user setups or admin view)
  if (shopDomains.length > 0) {
    shopifyQuery = shopifyQuery.in("shop_domain", shopDomains);
  }

  const { data: shopifyProducts } = await shopifyQuery;

  if (shopifyProducts) {
    // Map shopify_products fields to match the expected format
    const mappedShopifyProducts = shopifyProducts.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.body_html,
      price: p.price,
      compare_at_price: p.compare_at_price,
      status: p.status,
      product_type: p.product_type,
      vendor: p.vendor,
      tags: p.tags,
      image_url: p.image_url,
      images: p.images,
      variant_count: p.variant_count,
      variants: p.variants,
      total_inventory: p.total_inventory,
      handle: p.handle,
      shopify_id: p.shopify_id,
      shop_domain: p.shop_domain,
      created_at: p.created_at,
      updated_at: p.updated_at,
      source: "shopify",
    }));
    allProducts = [...allProducts, ...mappedShopifyProducts];
  }

  // Sort by updated_at/created_at descending
  allProducts.sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateB - dateA;
  });

  // Debug info
  const shopifyCount = shopifyProducts?.length || 0;
  console.log("[Products API] User:", user.id);
  console.log("[Products API] Shop domains:", shopDomains);
  console.log("[Products API] Manual products:", ecommerceProducts?.length || 0);
  console.log("[Products API] Shopify products:", shopifyCount);
  console.log("[Products API] Total products:", allProducts.length);

  return NextResponse.json({
    products: allProducts,
    _debug: {
      userId: user.id,
      shopDomains,
      manualCount: ecommerceProducts?.length || 0,
      shopifyCount,
      totalCount: allProducts.length
    }
  });
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

  const {
    // Title & Description
    title,
    description,
    // Media
    image_url,
    // Pricing
    price,
    compare_at_price,
    cost_per_item,
    charge_tax,
    // Inventory
    sku,
    barcode,
    inventory_quantity,
    track_inventory,
    continue_selling,
    // Shipping
    is_physical,
    weight,
    weight_unit,
    country_of_origin,
    hs_code,
    // Product Organization
    product_type,
    vendor,
    collections,
    tags,
    // Theme
    template_suffix,
    // Publishing
    status,
    // SEO
    seo_title,
    seo_description,
    handle,
  } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Build variants array with inventory data
  const variants = [{
    title: "Default",
    price: price || null,
    compare_at_price: compare_at_price || null,
    sku: sku || null,
    barcode: barcode || null,
    inventory_quantity: inventory_quantity ? parseInt(inventory_quantity) : 0,
    inventory_policy: continue_selling ? "continue" : "deny",
    taxable: charge_tax !== false,
    requires_shipping: is_physical !== false,
    weight: weight ? parseFloat(weight) : null,
    weight_unit: weight_unit || "kg",
    country_code_of_origin: country_of_origin || null,
    harmonized_system_code: hs_code || null,
  }];

  const { data: product, error } = await admin
    .from("ecommerce_products")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      body_html: description || null,
      image_url: image_url || null,
      price: price || null,
      compare_at_price: compare_at_price || null,
      cost_per_item: cost_per_item || null,
      status: status || "active",
      product_type: product_type || null,
      vendor: vendor || null,
      collections: collections || null,
      tags: tags || null,
      template_suffix: template_suffix || null,
      handle: handle || title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || null,
      seo_title: seo_title || null,
      seo_description: seo_description || null,
      sku: sku || null,
      barcode: barcode || null,
      inventory_quantity: inventory_quantity ? parseInt(inventory_quantity) : 0,
      total_inventory: inventory_quantity ? parseInt(inventory_quantity) : 0,
      track_inventory: track_inventory !== false,
      is_physical: is_physical !== false,
      weight: weight ? parseFloat(weight) : null,
      weight_unit: weight_unit || "kg",
      country_of_origin: country_of_origin || null,
      hs_code: hs_code || null,
      variants: variants,
      variant_count: 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product });
}

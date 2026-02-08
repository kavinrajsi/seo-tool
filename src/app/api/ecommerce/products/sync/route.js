import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const SHOPIFY_API_VERSION = "2024-01";
const PAGE_LIMIT = 250;

// Parse product data (same mapping as webhook handler)
function parseProductData(product, shopDomain) {
  const variants = (product.variants || []).map((v) => ({
    id: v.id,
    title: v.title,
    price: v.price,
    compare_at_price: v.compare_at_price,
    sku: v.sku,
    barcode: v.barcode,
    position: v.position,
    inventory_policy: v.inventory_policy,
    inventory_quantity: v.inventory_quantity,
    inventory_management: v.inventory_management,
    inventory_item_id: v.inventory_item_id,
    fulfillment_service: v.fulfillment_service,
    weight: v.weight,
    weight_unit: v.weight_unit,
    grams: v.grams,
    requires_shipping: v.requires_shipping,
    taxable: v.taxable,
    tax_code: v.tax_code,
    option1: v.option1,
    option2: v.option2,
    option3: v.option3,
    image_id: v.image_id,
    created_at: v.created_at,
    updated_at: v.updated_at,
  }));

  const images = (product.images || []).map((img) => ({
    id: img.id,
    src: img.src,
    alt: img.alt,
    width: img.width,
    height: img.height,
    position: img.position,
    variant_ids: img.variant_ids,
  }));

  const options = (product.options || []).map((opt) => ({
    id: opt.id,
    name: opt.name,
    position: opt.position,
    values: opt.values,
  }));

  return {
    shopify_id: String(product.id),
    shop_domain: shopDomain,
    title: product.title,
    body_html: product.body_html,
    vendor: product.vendor,
    product_type: product.product_type,
    handle: product.handle,
    status: product.status,
    published_at: product.published_at,
    published_scope: product.published_scope,
    tags: product.tags,
    template_suffix: product.template_suffix,
    price: product.variants?.[0]?.price || null,
    compare_at_price: product.variants?.[0]?.compare_at_price || null,
    image_url: product.image?.src || product.images?.[0]?.src || null,
    variants,
    variant_count: variants.length,
    images,
    options,
    total_inventory: variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0),
    created_at_shopify: product.created_at,
    updated_at_shopify: product.updated_at,
    synced_at: new Date().toISOString(),
  };
}

// Extract next page URL from Shopify Link header
function getNextPageUrl(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

/**
 * Sync all products from Shopify Admin API
 *
 * POST /api/ecommerce/products/sync
 */
export async function POST() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get user's Shopify connection
  const { data: connection, error: connError } = await admin
    .from("shopify_connections")
    .select("shop_domain, access_token")
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json(
      { error: "No Shopify store connected. Register webhooks first." },
      { status: 404 }
    );
  }

  const { shop_domain, access_token } = connection;

  if (!access_token) {
    return NextResponse.json(
      { error: "Missing Shopify access token. Please reconnect your store." },
      { status: 400 }
    );
  }

  let synced = 0;
  let failed = 0;
  let totalFetched = 0;

  try {
    let url = `https://${shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${PAGE_LIMIT}`;

    while (url) {
      const res = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": access_token,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        return NextResponse.json(
          { error: `Shopify API error (${res.status}): ${errText}`, synced, failed },
          { status: 502 }
        );
      }

      const data = await res.json();
      const products = data.products || [];
      totalFetched += products.length;

      // Upsert products in batches
      if (products.length > 0) {
        const rows = products.map((p) => parseProductData(p, shop_domain));

        const { error: upsertError } = await admin
          .from("shopify_products")
          .upsert(rows, { onConflict: "shop_domain,shopify_id" });

        if (upsertError) {
          console.error("[Product Sync] Batch upsert error:", upsertError.message);
          failed += products.length;
        } else {
          synced += products.length;
        }
      }

      // Follow pagination
      const linkHeader = res.headers.get("link");
      url = getNextPageUrl(linkHeader);
    }

    // Update last_synced_at
    await admin
      .from("shopify_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      synced,
      failed,
      totalFetched,
      message: `Synced ${synced} product${synced !== 1 ? "s" : ""} from Shopify`,
    });

  } catch (err) {
    console.error("[Product Sync] Error:", err.message);
    return NextResponse.json(
      { error: "Sync failed: " + err.message, synced, failed },
      { status: 500 }
    );
  }
}

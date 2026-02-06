import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

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

  const { csvData } = body;
  if (!csvData || !Array.isArray(csvData)) {
    return NextResponse.json({ error: "Invalid CSV data" }, { status: 400 });
  }

  const products = [];
  let currentProduct = null;
  let variantCount = 0;

  for (const row of csvData) {
    // If Title is present, this is a new product
    if (row.Title && row.Title.trim()) {
      // Save previous product if exists
      if (currentProduct) {
        currentProduct.variant_count = variantCount;
        products.push(currentProduct);
      }

      // Start new product
      currentProduct = {
        user_id: user.id,
        title: row.Title.trim(),
        description: row.Description || null,
        handle: row["URL handle"] || null,
        vendor: row.Vendor || null,
        product_type: row.Type || null,
        tags: row.Tags || null,
        status: (row.Status || "active").toLowerCase(),
        price: row.Price || null,
        compare_at_price: row["Compare-at price"] || null,
        sku: row.SKU || null,
        barcode: row.Barcode || null,
        image_url: row["Product image URL"] || null,
        inventory_quantity: row["Inventory quantity"] ? parseInt(row["Inventory quantity"]) : null,
        weight: row["Weight value (grams)"] || null,
        weight_unit: row["Weight unit for display"] || "g",
        requires_shipping: row["Requires shipping"] === "TRUE",
        seo_title: row["SEO title"] || null,
        seo_description: row["SEO description"] || null,
        option1_name: row["Option1 name"] || null,
        option1_value: row["Option1 value"] || null,
        option2_name: row["Option2 name"] || null,
        option2_value: row["Option2 value"] || null,
        option3_name: row["Option3 name"] || null,
        option3_value: row["Option3 value"] || null,
      };
      variantCount = 1;
    } else if (currentProduct) {
      // This is a variant row - increment variant count and update inventory
      variantCount++;

      // Add variant inventory to total
      if (row["Inventory quantity"]) {
        const qty = parseInt(row["Inventory quantity"]);
        if (currentProduct.inventory_quantity !== null) {
          currentProduct.inventory_quantity += qty;
        } else {
          currentProduct.inventory_quantity = qty;
        }
      }
    }
  }

  // Don't forget the last product
  if (currentProduct) {
    currentProduct.variant_count = variantCount;
    products.push(currentProduct);
  }

  if (products.length === 0) {
    return NextResponse.json({ error: "No products found in CSV" }, { status: 400 });
  }

  // Insert products
  const { data: inserted, error } = await admin
    .from("ecommerce_products")
    .insert(products)
    .select();

  if (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    imported: inserted?.length || 0,
  });
}

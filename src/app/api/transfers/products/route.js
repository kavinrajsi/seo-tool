import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getAccessibleProjectIds } from "@/lib/projectAccess";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";

  let query = admin
    .from("transfer_products")
    .select("*")
    .is("deleted_at", null)
    .order("product_name", { ascending: true });

  if (projectId && projectId !== "all") {
    query = query.eq("project_id", projectId);
  } else {
    const accessibleIds = await getAccessibleProjectIds(user.id);
    if (accessibleIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project_id.in.(${accessibleIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
  }

  const { data: products, error } = await query;

  if (error) {
    console.error("[Transfer Products API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = products || [];
  const categories = [...new Set(items.filter((p) => p.product_category).map((p) => p.product_category))];
  const stats = {
    total: items.length,
    active: items.filter((p) => p.is_active).length,
    categories: categories.length,
  };

  return NextResponse.json({ products: items, stats, categories });
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
    product_name, product_code, product_category, brand,
    unit, price, currency, image_url, notes, projectId,
  } = body;

  if (!product_name) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  const validUnits = ["pcs", "kg", "box"];
  if (unit && !validUnits.includes(unit)) {
    return NextResponse.json({ error: `Unit must be one of: ${validUnits.join(", ")}` }, { status: 400 });
  }

  const { data: product, error } = await admin
    .from("transfer_products")
    .insert({
      user_id: user.id,
      project_id: projectId || null,
      product_name: product_name.trim(),
      product_code: product_code ? product_code.trim() : null,
      product_category: product_category ? product_category.trim() : null,
      brand: brand ? brand.trim() : null,
      unit: unit || "pcs",
      price: price || null,
      currency: currency || "INR",
      image_url: image_url ? image_url.trim() : null,
      is_active: true,
      notes: notes ? notes.trim() : null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[Transfer Products API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product }, { status: 201 });
}

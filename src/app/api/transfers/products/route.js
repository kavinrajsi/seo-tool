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

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  let query = admin
    .from("transfer_products")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("product_name", { ascending: true });

  if (projectId && projectId !== "all") {
    query = query.eq("project_id", projectId);
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
    unit, price, currency, image_url, notes,
    project_id,
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
      project_id: project_id || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[Transfer Products API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product }, { status: 201 });
}

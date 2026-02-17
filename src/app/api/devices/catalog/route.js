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

  let query = admin
    .from("device_catalog")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("brand", { ascending: true });

  const { data: items, error } = await query;

  if (error) {
    console.error("[Device Catalog API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: items || [] });
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

  const { brand, model, device_type, price, currency, notes } = body;

  if (!brand || !model) {
    return NextResponse.json({ error: "Brand and model are required" }, { status: 400 });
  }

  if (price !== undefined && price !== null && (isNaN(price) || price < 0)) {
    return NextResponse.json({ error: "Price must be a valid positive number" }, { status: 400 });
  }

  const { data: item, error } = await admin
    .from("device_catalog")
    .insert({
      user_id: user.id,
      brand: brand.trim(),
      model: model.trim(),
      device_type: device_type || "laptop",
      price: price || null,
      currency: currency || "INR",
      notes: notes ? notes.trim() : null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Device Catalog API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
}

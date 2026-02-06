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

  const { data: orders, error } = await admin
    .from("ecommerce_orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: orders || [] });
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

  // Generate order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

  const { data: order, error } = await admin
    .from("ecommerce_orders")
    .insert({
      user_id: user.id,
      order_number: orderNumber,
      customer_email: body.customer_email || null,
      customer_name: body.customer_name || null,
      status: body.status || "pending",
      total_price: body.total_price || "0.00",
      subtotal_price: body.subtotal_price || "0.00",
      total_tax: body.total_tax || "0.00",
      shipping_address: body.shipping_address || null,
      billing_address: body.billing_address || null,
      line_items: body.line_items || [],
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order });
}

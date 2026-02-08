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

  const { data: alert, error } = await admin
    .from("inventory_alerts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const { data: logs } = await admin
    .from("inventory_alert_logs")
    .select("*")
    .eq("alert_id", id)
    .order("triggered_at", { ascending: false });

  return NextResponse.json({ alert, logs: logs || [] });
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

  const updates = {};
  if (body.threshold !== undefined) {
    if (typeof body.threshold !== "number" || body.threshold < 0) {
      return NextResponse.json({ error: "Threshold must be a non-negative number" }, { status: 400 });
    }
    updates.threshold = body.threshold;
  }
  if (body.status) {
    if (!["active", "paused", "triggered"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  updates.updated_at = new Date().toISOString();

  // If re-activating, re-check stock
  if (updates.status === "active") {
    const { data: existing } = await admin
      .from("inventory_alerts")
      .select("product_id, threshold, current_stock")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      const th = updates.threshold !== undefined ? updates.threshold : existing.threshold;
      const { data: product } = await admin
        .from("shopify_products")
        .select("inventory_quantity")
        .eq("shopify_id", existing.product_id)
        .single();

      if (product && product.inventory_quantity !== null) {
        updates.current_stock = product.inventory_quantity;
        if (product.inventory_quantity <= th) {
          updates.status = "triggered";
          updates.last_triggered_at = new Date().toISOString();

          await admin.from("inventory_alert_logs").insert({
            alert_id: id,
            user_id: user.id,
            product_title: null,
            previous_stock: existing.current_stock,
            current_stock: product.inventory_quantity,
            threshold: th,
          });
        }
      }
    }
  }

  const { data: alert, error } = await admin
    .from("inventory_alerts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[Inventory Alerts API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await admin
    .from("inventory_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[Inventory Alerts API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

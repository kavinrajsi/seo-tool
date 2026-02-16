import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole, getAccessibleProjectIds } from "@/lib/projectAccess";
import { canEditProjectData } from "@/lib/permissions";

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
    .from("inventory_alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId && projectId !== "all") {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    query = query.eq("project_id", projectId);
  } else {
    const accessibleIds = await getAccessibleProjectIds(user.id);
    if (accessibleIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project_id.in.(${accessibleIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
  }

  const { data: alerts, error } = await query;

  if (error) {
    console.error("[Inventory Alerts API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = alerts || [];

  // Check current stock for each alert from shopify_products
  for (const alert of all) {
    const { data: product } = await admin
      .from("shopify_products")
      .select("inventory_quantity")
      .eq("shopify_id", alert.product_id)
      .single();

    if (product && product.inventory_quantity !== null) {
      const currentStock = product.inventory_quantity;
      const updates = { current_stock: currentStock, updated_at: new Date().toISOString() };

      // Auto-trigger if stock <= threshold and alert is active
      if (currentStock <= alert.threshold && alert.status === "active") {
        updates.status = "triggered";
        updates.last_triggered_at = new Date().toISOString();

        // Log the trigger event
        await admin.from("inventory_alert_logs").insert({
          alert_id: alert.id,
          user_id: user.id,
          product_title: alert.product_title,
          previous_stock: alert.current_stock,
          current_stock: currentStock,
          threshold: alert.threshold,
        });

        alert.status = "triggered";
        alert.last_triggered_at = updates.last_triggered_at;
      }

      // Update the alert's current stock
      await admin
        .from("inventory_alerts")
        .update(updates)
        .eq("id", alert.id);

      alert.current_stock = currentStock;
    }
  }

  // Compute stats
  const total = all.length;
  const active = all.filter((a) => a.status === "active").length;
  const triggered = all.filter((a) => a.status === "triggered").length;
  const paused = all.filter((a) => a.status === "paused").length;

  // Fetch recent logs
  const { data: logs } = await admin
    .from("inventory_alert_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("triggered_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    alerts: all,
    stats: { total, active, triggered, paused },
    logs: logs || [],
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

  const { product_id, product_title, product_image, threshold, projectId } = body;

  if (!product_id || !product_title || threshold === undefined || threshold === null) {
    return NextResponse.json({ error: "product_id, product_title, and threshold are required" }, { status: 400 });
  }

  // Verify project access if projectId provided
  if (projectId) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  if (typeof threshold !== "number" || threshold < 0) {
    return NextResponse.json({ error: "Threshold must be a non-negative number" }, { status: 400 });
  }

  // Check current stock from shopify_products
  let currentStock = 0;
  let status = "active";
  const { data: product } = await admin
    .from("shopify_products")
    .select("inventory_quantity")
    .eq("shopify_id", product_id)
    .single();

  if (product && product.inventory_quantity !== null) {
    currentStock = product.inventory_quantity;
    if (currentStock <= threshold) {
      status = "triggered";
    }
  }

  const insertData = {
    user_id: user.id,
    project_id: projectId || null,
    product_id,
    product_title,
    product_image: product_image || null,
    threshold,
    current_stock: currentStock,
    status,
    last_triggered_at: status === "triggered" ? new Date().toISOString() : null,
  };

  const { data: alert, error } = await admin
    .from("inventory_alerts")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[Inventory Alerts API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log if immediately triggered
  if (status === "triggered") {
    await admin.from("inventory_alert_logs").insert({
      alert_id: alert.id,
      user_id: user.id,
      product_title,
      previous_stock: null,
      current_stock: currentStock,
      threshold,
    });
  }

  return NextResponse.json({ alert }, { status: 201 });
}

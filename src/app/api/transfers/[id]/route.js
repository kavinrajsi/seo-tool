import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: transfer, error } = await admin
    .from("transfers")
    .select(`
      *,
      source:transfer_locations!source_location_id(id, location_name, location_code, location_type, city),
      destination:transfer_locations!destination_location_id(id, location_name, location_code, location_type, city),
      items:transfer_items(*)
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !transfer) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  // Fetch status log
  const { data: statusLog } = await admin
    .from("transfer_status_log")
    .select("*, changer:profiles!fk_transfer_status_log_changer(id, full_name, email)")
    .eq("transfer_id", id)
    .order("changed_at", { ascending: false });

  // Fetch packing tasks
  const { data: packingTasks } = await admin
    .from("transfer_packing_tasks")
    .select("*, assignee:profiles!fk_transfer_packing_assigned_to(id, full_name, email), assigner:profiles!fk_transfer_packing_assigned_by(id, full_name, email)")
    .eq("transfer_id", id)
    .order("created_at", { ascending: false });

  // Fetch delivery assignments
  const { data: deliveryAssignments } = await admin
    .from("transfer_delivery_assignments")
    .select("*, assignee:profiles!fk_transfer_delivery_assigned_to(id, full_name, email), assigner:profiles!fk_transfer_delivery_assigned_by(id, full_name, email)")
    .eq("transfer_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    transfer,
    statusLog: statusLog || [],
    packingTasks: packingTasks || [],
    deliveryAssignments: deliveryAssignments || [],
  });
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Only allow updates before approval
  const { data: existing } = await admin
    .from("transfers")
    .select("transfer_status, requested_by")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  if (existing.transfer_status !== "requested") {
    return NextResponse.json({ error: "Can only edit transfers in 'requested' status" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = ["priority", "request_notes", "internal_notes", "expected_delivery_date"];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data: transfer, error } = await admin
    .from("transfers")
    .update(updates)
    .eq("id", id)
    .select("*, source:transfer_locations!source_location_id(id, location_name, location_code, location_type), destination:transfer_locations!destination_location_id(id, location_name, location_code, location_type), items:transfer_items(*)")
    .single();

  if (error) {
    console.error("[Transfers API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update items if provided
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      if (item.id) {
        await admin
          .from("transfer_items")
          .update({
            product_name: item.product_name,
            product_code: item.product_code || null,
            product_category: item.product_category || null,
            quantity_requested: item.quantity_requested,
            unit: item.unit || "pcs",
            item_notes: item.item_notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      } else {
        await admin
          .from("transfer_items")
          .insert({
            transfer_id: id,
            product_name: item.product_name.trim(),
            product_code: item.product_code || null,
            product_category: item.product_category || null,
            quantity_requested: item.quantity_requested,
            quantity_packed: 0,
            quantity_delivered: 0,
            unit: item.unit || "pcs",
            item_notes: item.item_notes || null,
          });
      }
    }
  }

  return NextResponse.json({ transfer });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await admin
    .from("transfers")
    .select("transfer_status")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  if (!["requested", "rejected", "cancelled"].includes(existing.transfer_status)) {
    return NextResponse.json({ error: "Cannot delete active transfers" }, { status: 400 });
  }

  const { error } = await admin
    .from("transfers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[Transfers API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

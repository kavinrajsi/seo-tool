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

  const { data: assignments, error } = await admin
    .from("transfer_delivery_assignments")
    .select("*, assignee:profiles!fk_transfer_delivery_assigned_to(id, full_name, email), assigner:profiles!fk_transfer_delivery_assigned_by(id, full_name, email)")
    .eq("transfer_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: assignments || [] });
}

export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { assigned_to, vehicle_number, driver_name, driver_phone, delivery_notes } = body;

  if (!assigned_to) {
    return NextResponse.json({ error: "assigned_to is required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: assignment, error } = await admin
    .from("transfer_delivery_assignments")
    .insert({
      transfer_id: id,
      assigned_to,
      assigned_by: user.id,
      assigned_at: now,
      delivery_status: "pending",
      vehicle_number: vehicle_number || null,
      driver_name: driver_name || null,
      driver_phone: driver_phone || null,
      delivery_notes: delivery_notes || null,
    })
    .select("*, assignee:profiles!fk_transfer_delivery_assigned_to(id, full_name, email), assigner:profiles!fk_transfer_delivery_assigned_by(id, full_name, email)")
    .single();

  if (error) {
    console.error("[Transfer Delivery API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignment }, { status: 201 });
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { assignment_id, delivery_status, vehicle_number, driver_name, driver_phone, delivery_notes, recipient_name, item_quantities } = body;

  if (!assignment_id) {
    return NextResponse.json({ error: "assignment_id is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updates = { updated_at: now };

  if (delivery_status) {
    updates.delivery_status = delivery_status;
    if (delivery_status === "picked_up") updates.picked_up_at = now;
    if (delivery_status === "delivered") updates.delivered_at = now;
  }
  if (vehicle_number !== undefined) updates.vehicle_number = vehicle_number;
  if (driver_name !== undefined) updates.driver_name = driver_name;
  if (driver_phone !== undefined) updates.driver_phone = driver_phone;
  if (delivery_notes !== undefined) updates.delivery_notes = delivery_notes;
  if (recipient_name !== undefined) updates.recipient_name = recipient_name;

  const { data: assignment, error } = await admin
    .from("transfer_delivery_assignments")
    .update(updates)
    .eq("id", assignment_id)
    .eq("transfer_id", id)
    .select("*, assignee:profiles!fk_transfer_delivery_assigned_to(id, full_name, email)")
    .single();

  if (error) {
    console.error("[Transfer Delivery API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update item delivery quantities if provided
  if (item_quantities && Array.isArray(item_quantities)) {
    for (const iq of item_quantities) {
      if (iq.item_id && iq.quantity_delivered !== undefined) {
        await admin
          .from("transfer_items")
          .update({ quantity_delivered: iq.quantity_delivered, updated_at: now })
          .eq("id", iq.item_id);
      }
    }
  }

  // Update transfer status based on delivery status
  if (delivery_status === "picked_up" || delivery_status === "in_transit") {
    const { data: transfer } = await admin
      .from("transfers")
      .select("transfer_status")
      .eq("id", id)
      .single();

    if (transfer && ["packed", "dispatched"].includes(transfer.transfer_status)) {
      const newStatus = delivery_status === "picked_up" ? "dispatched" : "in_transit";
      await admin.from("transfers").update({
        transfer_status: newStatus,
        dispatched_at: delivery_status === "picked_up" ? now : undefined,
        updated_at: now,
      }).eq("id", id);

      await admin.from("transfer_status_log").insert({
        transfer_id: id,
        from_status: transfer.transfer_status,
        to_status: newStatus,
        changed_by: user.id,
        changed_at: now,
        notes: `Delivery ${delivery_status}`,
      });
    }
  }

  if (delivery_status === "delivered") {
    await admin.from("transfers").update({
      transfer_status: "delivered",
      delivered_at: now,
      updated_at: now,
    }).eq("id", id);

    await admin.from("transfer_status_log").insert({
      transfer_id: id,
      from_status: "in_transit",
      to_status: "delivered",
      changed_by: user.id,
      changed_at: now,
      notes: recipient_name ? `Delivered to ${recipient_name}` : "Delivery completed",
    });
  }

  return NextResponse.json({ assignment });
}

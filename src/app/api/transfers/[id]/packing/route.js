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

  const { data: tasks, error } = await admin
    .from("transfer_packing_tasks")
    .select("*, assignee:profiles!fk_transfer_packing_assigned_to(id, full_name, email), assigner:profiles!fk_transfer_packing_assigned_by(id, full_name, email)")
    .eq("transfer_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks || [] });
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

  const { assigned_to, packing_notes } = body;

  if (!assigned_to) {
    return NextResponse.json({ error: "assigned_to is required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: task, error } = await admin
    .from("transfer_packing_tasks")
    .insert({
      transfer_id: id,
      assigned_to,
      assigned_by: user.id,
      assigned_at: now,
      task_status: "pending",
      packing_notes: packing_notes || null,
    })
    .select("*, assignee:profiles!fk_transfer_packing_assigned_to(id, full_name, email), assigner:profiles!fk_transfer_packing_assigned_by(id, full_name, email)")
    .single();

  if (error) {
    console.error("[Transfer Packing API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update transfer status to packing if warehouse_approved
  const { data: transfer } = await admin
    .from("transfers")
    .select("transfer_status")
    .eq("id", id)
    .single();

  if (transfer && transfer.transfer_status === "warehouse_approved") {
    await admin.from("transfers").update({
      transfer_status: "packing",
      updated_at: now,
    }).eq("id", id);

    await admin.from("transfer_status_log").insert({
      transfer_id: id,
      from_status: "warehouse_approved",
      to_status: "packing",
      changed_by: user.id,
      changed_at: now,
      notes: "Packing task assigned",
    });
  }

  return NextResponse.json({ task }, { status: 201 });
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

  const { task_id, task_status, packing_notes, item_quantities } = body;

  if (!task_id) {
    return NextResponse.json({ error: "task_id is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updates = { updated_at: now };

  if (task_status) {
    updates.task_status = task_status;
    if (task_status === "in_progress") updates.started_at = now;
    if (task_status === "completed") updates.completed_at = now;
  }
  if (packing_notes !== undefined) updates.packing_notes = packing_notes;

  const { data: task, error } = await admin
    .from("transfer_packing_tasks")
    .update(updates)
    .eq("id", task_id)
    .eq("transfer_id", id)
    .select("*, assignee:profiles!fk_transfer_packing_assigned_to(id, full_name, email)")
    .single();

  if (error) {
    console.error("[Transfer Packing API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update item quantities if provided
  if (item_quantities && Array.isArray(item_quantities)) {
    for (const iq of item_quantities) {
      if (iq.item_id && iq.quantity_packed !== undefined) {
        await admin
          .from("transfer_items")
          .update({ quantity_packed: iq.quantity_packed, updated_at: now })
          .eq("id", iq.item_id);
      }
    }
  }

  // If packing completed, update transfer status to packed
  if (task_status === "completed") {
    const { data: allTasks } = await admin
      .from("transfer_packing_tasks")
      .select("task_status")
      .eq("transfer_id", id);

    const allCompleted = allTasks && allTasks.every((t) => t.task_status === "completed");
    if (allCompleted) {
      await admin.from("transfers").update({
        transfer_status: "packed",
        updated_at: now,
      }).eq("id", id);

      await admin.from("transfer_status_log").insert({
        transfer_id: id,
        from_status: "packing",
        to_status: "packed",
        changed_by: user.id,
        changed_at: now,
        notes: "All packing tasks completed",
      });
    }
  }

  return NextResponse.json({ task });
}

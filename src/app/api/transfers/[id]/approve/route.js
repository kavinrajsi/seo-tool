import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

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

  const { action, rejection_reason, notes } = body;

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
  }

  // Fetch transfer
  const { data: transfer } = await admin
    .from("transfers")
    .select("*, source:transfer_locations!source_location_id(id, location_type), destination:transfer_locations!destination_location_id(id, location_type)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!transfer) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  // Check user's roles at the relevant locations
  const { data: userRoles } = await admin
    .from("transfer_roles")
    .select("role, location_id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const roles = userRoles || [];
  const now = new Date().toISOString();

  if (action === "reject") {
    if (!["requested", "store_approved"].includes(transfer.transfer_status)) {
      return NextResponse.json({ error: "Transfer cannot be rejected in its current status" }, { status: 400 });
    }

    // Verify user has manager role at source or destination
    const hasAuth = roles.some((r) =>
      (r.role === "store_manager" && r.location_id === transfer.source_location_id) ||
      (r.role === "warehouse_manager" && (r.location_id === transfer.source_location_id || r.location_id === transfer.destination_location_id))
    );

    if (!hasAuth) {
      return NextResponse.json({ error: "You don't have permission to reject this transfer" }, { status: 403 });
    }

    const fromStatus = transfer.transfer_status;
    await admin
      .from("transfers")
      .update({
        transfer_status: "rejected",
        rejected_by: user.id,
        rejected_at: now,
        rejection_reason: rejection_reason || null,
        updated_at: now,
      })
      .eq("id", id);

    await admin.from("transfer_status_log").insert({
      transfer_id: id,
      from_status: fromStatus,
      to_status: "rejected",
      changed_by: user.id,
      changed_at: now,
      notes: rejection_reason || notes || "Transfer rejected",
    });

    return NextResponse.json({ success: true, status: "rejected" });
  }

  // Approve flow
  if (transfer.transfer_status === "requested") {
    // Store manager approval needed
    const isSourceManager = roles.some(
      (r) => r.role === "store_manager" && r.location_id === transfer.source_location_id
    );
    const isSourceWarehouseManager = roles.some(
      (r) => r.role === "warehouse_manager" && r.location_id === transfer.source_location_id
    );

    if (!isSourceManager && !isSourceWarehouseManager) {
      return NextResponse.json({ error: "You must be a manager at the source location to approve" }, { status: 403 });
    }

    // Determine next status
    const sourceIsWarehouse = transfer.source?.location_type === "warehouse";
    const destIsWarehouse = transfer.destination?.location_type === "warehouse";

    let nextStatus;
    if (isSourceWarehouseManager) {
      // Warehouse manager can directly move to warehouse_approved if they're the source
      nextStatus = "warehouse_approved";
      await admin.from("transfers").update({
        transfer_status: nextStatus,
        store_approved_by: user.id,
        store_approved_at: now,
        warehouse_approved_by: user.id,
        warehouse_approved_at: now,
        updated_at: now,
      }).eq("id", id);
    } else if (!sourceIsWarehouse && !destIsWarehouse) {
      // Store-to-store: only store manager approval needed, skip to warehouse_approved
      nextStatus = "warehouse_approved";
      await admin.from("transfers").update({
        transfer_status: nextStatus,
        store_approved_by: user.id,
        store_approved_at: now,
        warehouse_approved_by: user.id,
        warehouse_approved_at: now,
        updated_at: now,
      }).eq("id", id);
    } else {
      // Store-to-warehouse or warehouse involved: needs warehouse approval next
      nextStatus = "store_approved";
      await admin.from("transfers").update({
        transfer_status: nextStatus,
        store_approved_by: user.id,
        store_approved_at: now,
        updated_at: now,
      }).eq("id", id);
    }

    await admin.from("transfer_status_log").insert({
      transfer_id: id,
      from_status: "requested",
      to_status: nextStatus,
      changed_by: user.id,
      changed_at: now,
      notes: notes || `Approved by store/source manager`,
    });

    return NextResponse.json({ success: true, status: nextStatus });
  }

  if (transfer.transfer_status === "store_approved") {
    // Warehouse manager approval needed
    const isWarehouseManager = roles.some(
      (r) => r.role === "warehouse_manager" &&
        (r.location_id === transfer.source_location_id || r.location_id === transfer.destination_location_id)
    );

    if (!isWarehouseManager) {
      return NextResponse.json({ error: "You must be a warehouse manager at the source or destination to approve" }, { status: 403 });
    }

    await admin.from("transfers").update({
      transfer_status: "warehouse_approved",
      warehouse_approved_by: user.id,
      warehouse_approved_at: now,
      updated_at: now,
    }).eq("id", id);

    await admin.from("transfer_status_log").insert({
      transfer_id: id,
      from_status: "store_approved",
      to_status: "warehouse_approved",
      changed_by: user.id,
      changed_at: now,
      notes: notes || "Approved by warehouse manager",
    });

    return NextResponse.json({ success: true, status: "warehouse_approved" });
  }

  return NextResponse.json({ error: `Cannot approve transfer in '${transfer.transfer_status}' status` }, { status: 400 });
}

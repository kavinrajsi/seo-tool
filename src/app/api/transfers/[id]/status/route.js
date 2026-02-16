import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const VALID_TRANSITIONS = {
  warehouse_approved: ["packing"],
  packing: ["packed"],
  packed: ["dispatched"],
  dispatched: ["in_transit"],
  in_transit: ["delivered"],
  requested: ["cancelled"],
};

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

  const { new_status, notes } = body;

  if (!new_status) {
    return NextResponse.json({ error: "new_status is required" }, { status: 400 });
  }

  const { data: transfer } = await admin
    .from("transfers")
    .select("transfer_status, requested_by")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!transfer) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[transfer.transfer_status];
  if (!allowed || !allowed.includes(new_status)) {
    return NextResponse.json({
      error: `Cannot transition from '${transfer.transfer_status}' to '${new_status}'`,
    }, { status: 400 });
  }

  // Cancel only by requester
  if (new_status === "cancelled" && transfer.requested_by !== user.id) {
    return NextResponse.json({ error: "Only the requester can cancel a transfer" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const updates = {
    transfer_status: new_status,
    updated_at: now,
  };

  if (new_status === "dispatched") updates.dispatched_at = now;
  if (new_status === "delivered") updates.delivered_at = now;

  const { error } = await admin
    .from("transfers")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[Transfer Status API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("transfer_status_log").insert({
    transfer_id: id,
    from_status: transfer.transfer_status,
    to_status: new_status,
    changed_by: user.id,
    changed_at: now,
    notes: notes || `Status changed to ${new_status}`,
  });

  return NextResponse.json({ success: true, status: new_status });
}

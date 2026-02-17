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
  const status = searchParams.get("status") || "";
  const tab = searchParams.get("tab") || "all";
  const search = searchParams.get("search") || "";
  const projectId = searchParams.get("project_id");

  let query = admin
    .from("transfers")
    .select("*, source:transfer_locations!source_location_id(id, location_name, location_code, location_type), destination:transfer_locations!destination_location_id(id, location_name, location_code, location_type), items:transfer_items(id, product_name, product_code, quantity_requested, quantity_packed, quantity_delivered, unit)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("transfer_status", status);
  }

  if (search) {
    query = query.or(`transfer_number.ilike.%${search}%,request_notes.ilike.%${search}%`);
  }

  if (projectId && projectId !== "all") {
    query = query.eq("project_id", projectId);
  }

  // Tab-based filtering
  if (tab === "my_requests") {
    query = query.eq("requested_by", user.id);
  } else if (tab === "approvals") {
    // Get user's manager roles to filter by location
    const { data: managerRoles } = await admin
      .from("transfer_roles")
      .select("location_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["store_manager", "warehouse_manager"]);

    if (managerRoles && managerRoles.length > 0) {
      const storeLocIds = managerRoles.filter((r) => r.role === "store_manager").map((r) => r.location_id);
      const warehouseLocIds = managerRoles.filter((r) => r.role === "warehouse_manager").map((r) => r.location_id);

      const conditions = [];
      if (storeLocIds.length > 0) {
        conditions.push(`and(source_location_id.in.(${storeLocIds.join(",")}),transfer_status.eq.requested)`);
      }
      if (warehouseLocIds.length > 0) {
        conditions.push(`and(destination_location_id.in.(${warehouseLocIds.join(",")}),transfer_status.eq.store_approved)`);
        conditions.push(`and(source_location_id.in.(${warehouseLocIds.join(",")}),transfer_status.eq.store_approved)`);
      }
      if (conditions.length > 0) {
        query = query.or(conditions.join(","));
      } else {
        return NextResponse.json({ transfers: [], stats: { total: 0, requested: 0, in_progress: 0, delivered: 0, rejected: 0 } });
      }
    } else {
      return NextResponse.json({ transfers: [], stats: { total: 0, requested: 0, in_progress: 0, delivered: 0, rejected: 0 } });
    }
  } else if (tab === "packing") {
    query = query.in("transfer_status", ["warehouse_approved", "packing"]);
  } else if (tab === "logistics") {
    query = query.in("transfer_status", ["packed", "dispatched", "in_transit"]);
  }

  const { data: transfers, error } = await query;

  if (error) {
    console.error("[Transfers API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = transfers || [];
  const stats = {
    total: items.length,
    requested: items.filter((t) => t.transfer_status === "requested").length,
    in_progress: items.filter((t) => ["store_approved", "warehouse_approved", "packing", "packed", "dispatched", "in_transit"].includes(t.transfer_status)).length,
    delivered: items.filter((t) => t.transfer_status === "delivered").length,
    rejected: items.filter((t) => t.transfer_status === "rejected").length,
  };

  return NextResponse.json({ transfers: items, stats });
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
    source_location_id, destination_location_id,
    priority, request_notes, items,
    expected_delivery_date,
    project_id,
  } = body;

  if (!source_location_id || !destination_location_id) {
    return NextResponse.json({ error: "Source and destination locations are required" }, { status: 400 });
  }

  if (source_location_id === destination_location_id) {
    return NextResponse.json({ error: "Source and destination must be different" }, { status: 400 });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.product_name || !item.quantity_requested || item.quantity_requested < 1) {
      return NextResponse.json({ error: "Each item needs a product name and quantity >= 1" }, { status: 400 });
    }
  }

  // Generate transfer number: TRF-YYYYMMDD-NNNN
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await admin
    .from("transfers")
    .select("*", { count: "exact", head: true })
    .like("transfer_number", `TRF-${dateStr}-%`);
  const seq = String((count || 0) + 1).padStart(4, "0");
  const transfer_number = `TRF-${dateStr}-${seq}`;

  const now = new Date().toISOString();

  const { data: transfer, error } = await admin
    .from("transfers")
    .insert({
      user_id: user.id,
      transfer_number,
      source_location_id,
      destination_location_id,
      transfer_status: "requested",
      priority: priority || "normal",
      requested_by: user.id,
      requested_at: now,
      request_notes: request_notes ? request_notes.trim() : null,
      expected_delivery_date: expected_delivery_date || null,
      project_id: project_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Transfers API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert items
  const itemRows = items.map((item) => ({
    transfer_id: transfer.id,
    product_name: item.product_name.trim(),
    product_code: item.product_code ? item.product_code.trim() : null,
    product_category: item.product_category || null,
    quantity_requested: item.quantity_requested,
    quantity_packed: 0,
    quantity_delivered: 0,
    unit: item.unit || "pcs",
    item_notes: item.item_notes || null,
  }));

  const { error: itemsError } = await admin
    .from("transfer_items")
    .insert(itemRows);

  if (itemsError) {
    console.error("[Transfers API] Items insert error:", itemsError.message);
  }

  // Create initial status log
  await admin.from("transfer_status_log").insert({
    transfer_id: transfer.id,
    from_status: null,
    to_status: "requested",
    changed_by: user.id,
    changed_at: now,
    notes: "Transfer request created",
  });

  // Fetch full transfer with relations
  const { data: fullTransfer } = await admin
    .from("transfers")
    .select("*, source:transfer_locations!source_location_id(id, location_name, location_code, location_type), destination:transfer_locations!destination_location_id(id, location_name, location_code, location_type), items:transfer_items(id, product_name, product_code, quantity_requested, quantity_packed, quantity_delivered, unit)")
    .eq("id", transfer.id)
    .single();

  return NextResponse.json({ transfer: fullTransfer }, { status: 201 });
}

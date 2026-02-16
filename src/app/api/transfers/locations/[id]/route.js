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

  const { data: location, error } = await admin
    .from("transfer_locations")
    .select("*, manager:employees(id, first_name, last_name)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json({ location });
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

  const allowed = [
    "location_name", "location_type", "location_code",
    "address_line_1", "address_line_2", "city", "state", "postal_code",
    "phone_number", "email", "manager_id", "is_active", "notes",
  ];

  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  if (updates.location_code) {
    updates.location_code = updates.location_code.trim().toUpperCase();
  }

  updates.updated_at = new Date().toISOString();

  const { data: location, error } = await admin
    .from("transfer_locations")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*, manager:employees(id, first_name, last_name)")
    .single();

  if (error) {
    console.error("[Transfer Locations API] Update error:", error.message);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Location code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ location });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await admin
    .from("transfer_locations")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);

  if (error) {
    console.error("[Transfer Locations API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

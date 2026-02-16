import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function isHrOrAdmin(admin, userId) {
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "hr" || profile?.role === "admin";
}

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: device, error } = await admin
    .from("devices")
    .select("*, assigned_employee:employees!devices_assigned_to_fkey(id, first_name, last_name, employee_number)")
    .eq("id", id)
    .single();

  if (error || !device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  return NextResponse.json({ device });
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: existing } = await admin.from("devices").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowedFields = [
    "device_type", "brand", "model", "serial_number", "asset_tag",
    "purchase_date", "warranty_expiry", "device_status", "notes", "assigned_to", "retired_at",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (typeof body[field] === "string") {
        updates[field] = body[field].trim() || null;
      } else {
        updates[field] = body[field];
      }
    }
  }

  if (updates.serial_number && updates.serial_number !== existing.serial_number) {
    const { data: dup } = await admin
      .from("devices")
      .select("id")
      .eq("serial_number", updates.serial_number)
      .neq("id", id)
      .limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: "A device with this serial number already exists" }, { status: 409 });
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data: device, error } = await admin
    .from("devices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Devices API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ device });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Soft delete — mark as retired with retired_at timestamp
  const { error } = await admin
    .from("devices")
    .update({
      device_status: "retired",
      retired_at: new Date().toISOString(),
      assigned_to: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[Devices API] Retire error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

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

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const hrAdmin = await isHrOrAdmin(admin, user.id);

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  let query = admin
    .from("devices")
    .select("*, assigned_employee:employees!devices_assigned_to_fkey(id, first_name, last_name, employee_number)")
    .order("created_at", { ascending: false });

  if (!hrAdmin) {
    query = query.eq("user_id", user.id);
  }

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data: devices, error } = await query;

  if (error) {
    console.error("[Devices API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = devices || [];
  const totalDevices = all.length;
  const availableCount = all.filter((d) => d.device_status === "available").length;
  const assignedCount = all.filter((d) => d.device_status === "assigned").length;
  const repairCount = all.filter((d) => d.device_status === "repair").length;
  const retiredCount = all.filter((d) => d.device_status === "retired").length;

  return NextResponse.json({
    devices: all,
    stats: { totalDevices, availableCount, assignedCount, repairCount, retiredCount },
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

  const {
    device_type, brand, model, serial_number, asset_tag,
    purchase_date, warranty_expiry, device_status, notes,
    project_id,
  } = body;

  if (!device_type || !brand || !model) {
    return NextResponse.json({ error: "Device type, brand, and model are required" }, { status: 400 });
  }

  if (serial_number) {
    const { data: existing } = await admin
      .from("devices")
      .select("id")
      .eq("serial_number", serial_number.trim())
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "A device with this serial number already exists" }, { status: 409 });
    }
  }

  const { data: device, error } = await admin
    .from("devices")
    .insert({
      user_id: user.id,
      project_id: project_id || null,
      device_type,
      brand: brand.trim(),
      model: model.trim(),
      serial_number: serial_number ? serial_number.trim() : null,
      asset_tag: asset_tag ? asset_tag.trim() : null,
      purchase_date: purchase_date || null,
      warranty_expiry: warranty_expiry || null,
      device_status: device_status || "available",
      notes: notes ? notes.trim() : null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Devices API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ device }, { status: 201 });
}

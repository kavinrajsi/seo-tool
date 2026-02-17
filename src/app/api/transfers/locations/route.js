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
  const projectId = searchParams.get("project_id");

  let query = admin
    .from("transfer_locations")
    .select("*, manager:employees(id, first_name, last_name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("location_name", { ascending: true });

  if (projectId && projectId !== "all") {
    query = query.eq("project_id", projectId);
  }

  const { data: locations, error } = await query;

  if (error) {
    console.error("[Transfer Locations API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = locations || [];
  const stats = {
    total: items.length,
    stores: items.filter((l) => l.location_type === "store").length,
    warehouses: items.filter((l) => l.location_type === "warehouse").length,
    active: items.filter((l) => l.is_active).length,
  };

  return NextResponse.json({ locations: items, stats });
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
    location_name, location_type, location_code,
    address_line_1, address_line_2, city, state, postal_code,
    phone_number, email, manager_id, notes,
    project_id,
  } = body;

  if (!location_name || !location_type || !location_code) {
    return NextResponse.json({ error: "Name, type, and code are required" }, { status: 400 });
  }

  if (!["store", "warehouse"].includes(location_type)) {
    return NextResponse.json({ error: "Type must be store or warehouse" }, { status: 400 });
  }

  const { data: location, error } = await admin
    .from("transfer_locations")
    .insert({
      user_id: user.id,
      location_name: location_name.trim(),
      location_type,
      location_code: location_code.trim().toUpperCase(),
      address_line_1: address_line_1 ? address_line_1.trim() : null,
      address_line_2: address_line_2 ? address_line_2.trim() : null,
      city: city ? city.trim() : null,
      state: state ? state.trim() : null,
      postal_code: postal_code ? postal_code.trim() : null,
      phone_number: phone_number ? phone_number.trim() : null,
      email: email ? email.trim() : null,
      manager_id: manager_id || null,
      is_active: true,
      notes: notes ? notes.trim() : null,
      project_id: project_id || null,
    })
    .select("*, manager:employees(id, first_name, last_name)")
    .single();

  if (error) {
    console.error("[Transfer Locations API] Insert error:", error.message);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Location code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ location }, { status: 201 });
}

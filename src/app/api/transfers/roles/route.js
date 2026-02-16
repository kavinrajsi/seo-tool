import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getAccessibleProjectIds } from "@/lib/projectAccess";

const VALID_ROLES = ["lineman", "store_manager", "warehouse_manager", "packing_team", "logistics_manager", "logistics_team"];

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";
  const locationId = searchParams.get("locationId") || "";

  let query = admin
    .from("transfer_roles")
    .select("*, location:transfer_locations(id, location_name, location_code, location_type), employee:employees(id, first_name, last_name), profile:profiles!fk_transfer_roles_profile(id, full_name, email)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  // Filter by locations the user can access
  if (projectId && projectId !== "all") {
    // Get locations for this project
    const { data: locs } = await admin
      .from("transfer_locations")
      .select("id")
      .eq("project_id", projectId)
      .is("deleted_at", null);
    const locIds = (locs || []).map((l) => l.id);
    if (locIds.length > 0) {
      query = query.in("location_id", locIds);
    } else {
      return NextResponse.json({ roles: [] });
    }
  }

  const { data: roles, error } = await query;

  if (error) {
    console.error("[Transfer Roles API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ roles: roles || [] });
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

  const { user_id, employee_id, location_id, role } = body;

  if (!user_id || !location_id || !role) {
    return NextResponse.json({ error: "user_id, location_id, and role are required" }, { status: 400 });
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  const { data: roleData, error } = await admin
    .from("transfer_roles")
    .insert({
      user_id,
      employee_id: employee_id || null,
      location_id,
      role,
      assigned_by: user.id,
      is_active: true,
    })
    .select("*, location:transfer_locations(id, location_name, location_code, location_type), employee:employees(id, first_name, last_name), profile:profiles!fk_transfer_roles_profile(id, full_name, email)")
    .single();

  if (error) {
    console.error("[Transfer Roles API] Insert error:", error.message);
    if (error.code === "23505") {
      return NextResponse.json({ error: "This user already has this role at this location" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ role: roleData }, { status: 201 });
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: assignments, error } = await admin
    .from("device_assignments")
    .select("*, employee:employees(id, first_name, last_name, employee_number)")
    .eq("device_id", id)
    .order("assigned_date", { ascending: false });

  if (error) {
    console.error("[Device Assignments API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: assignments || [] });
}

export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

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

  const { employee_id, assigned_date, notes } = body;

  if (!employee_id) {
    return NextResponse.json({ error: "Employee is required" }, { status: 400 });
  }

  // Close any current open assignment for this device
  const { data: openAssignments } = await admin
    .from("device_assignments")
    .select("id")
    .eq("device_id", id)
    .is("returned_date", null);

  if (openAssignments && openAssignments.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    for (const a of openAssignments) {
      await admin
        .from("device_assignments")
        .update({ returned_date: today })
        .eq("id", a.id);
    }
  }

  // Create new assignment
  const { data: assignment, error } = await admin
    .from("device_assignments")
    .insert({
      device_id: id,
      employee_id,
      assigned_date: assigned_date || new Date().toISOString().split("T")[0],
      assigned_by: user.id,
      notes: notes || null,
    })
    .select("*, employee:employees(id, first_name, last_name, employee_number)")
    .single();

  if (error) {
    console.error("[Device Assignments API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update device status and assigned_to
  await admin
    .from("devices")
    .update({ device_status: "assigned", assigned_to: employee_id, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ assignment }, { status: 201 });
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function getUserProjectRole(admin, userId, projectId) {
  const { data } = await admin
    .from("project_members")
    .select("role")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .single();
  return data?.role || null;
}

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getUserProjectRole(admin, user.id, id);
  if (!role) {
    return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const available = searchParams.get("available");

  if (available === "true") {
    // Get employee IDs already assigned to this project
    const { data: assigned } = await admin
      .from("project_employees")
      .select("employee_id")
      .eq("project_id", id);
    const assignedIds = (assigned || []).map((a) => a.employee_id);

    // Get active employees belonging to the user that are NOT in this project
    let query = admin
      .from("employees")
      .select("id, first_name, last_name, designation, work_email, employee_status")
      .eq("user_id", user.id)
      .eq("employee_status", "active")
      .order("first_name", { ascending: true });

    if (assignedIds.length > 0) {
      query = query.not("id", "in", `(${assignedIds.join(",")})`);
    }

    const { data: employees, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ employees: employees || [] });
  }

  // Get employees assigned to this project via the join table (only active)
  const { data: assignments, error: assignError } = await admin
    .from("project_employees")
    .select("employee_id, employees(id, first_name, last_name, designation, work_email, employee_status)")
    .eq("project_id", id);

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 });
  }

  const employees = (assignments || [])
    .map((a) => a.employees)
    .filter((e) => e && e.employee_status === "active");

  return NextResponse.json({ employees });
}

export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getUserProjectRole(admin, user.id, id);
  if (!role) {
    return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
  }

  const { employee_id } = await request.json();
  if (!employee_id) {
    return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
  }

  // Verify the employee exists and is active
  const { data: emp } = await admin
    .from("employees")
    .select("id, employee_status")
    .eq("id", employee_id)
    .single();

  if (!emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  if (emp.employee_status !== "active") {
    return NextResponse.json({ error: "Only active employees can be assigned to projects" }, { status: 400 });
  }

  const { error } = await admin
    .from("project_employees")
    .insert({ project_id: id, employee_id });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Employee is already assigned to this project" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getUserProjectRole(admin, user.id, id);
  if (!role) {
    return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id");

  if (!employeeId) {
    return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
  }

  const { error } = await admin
    .from("project_employees")
    .delete()
    .eq("project_id", id)
    .eq("employee_id", employeeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

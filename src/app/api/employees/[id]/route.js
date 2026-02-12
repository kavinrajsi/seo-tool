import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canEditProjectData, canDeleteProjectData } from "@/lib/permissions";

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

  const { data: employee, error } = await admin
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // HR and admin users can access any employee
  const hrAdmin = await isHrOrAdmin(admin, user.id);
  if (!hrAdmin) {
    const isOwner = employee.user_id === user.id;
    let hasProjectAccess = false;
    if (employee.project_id) {
      const projectRole = await getUserProjectRole(user.id, employee.project_id);
      hasProjectAccess = !!projectRole;
    }
    if (!isOwner && !hasProjectAccess) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
  }

  // Enrich with linked profile info
  let linked_profile = null;
  if (employee.linked_profile_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", employee.linked_profile_id)
      .single();
    if (profile) {
      linked_profile = { full_name: profile.full_name, email: profile.email };
    }
  }

  return NextResponse.json({ employee: { ...employee, linked_profile } });
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: existing } = await admin.from("employees").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // HR and admin users can edit any employee
  const hrAdmin = await isHrOrAdmin(admin, user.id);
  if (!hrAdmin) {
    const isOwner = existing.user_id === user.id;
    let hasProjectAccess = false;
    if (existing.project_id) {
      const projectRole = await getUserProjectRole(user.id, existing.project_id);
      hasProjectAccess = projectRole && canEditProjectData(projectRole);
    }
    if (!isOwner && !hasProjectAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowedFields = [
    "first_name", "middle_name", "last_name", "gender", "date_of_birth",
    "date_of_joining", "designation", "department", "employee_status", "role",
    "work_email", "personal_email", "mobile_number", "mobile_number_emergency",
    "personal_address_line_1", "personal_address_line_2", "personal_city",
    "personal_state", "personal_postal_code", "aadhaar_number", "pan_number",
    "blood_type", "shirt_size", "employee_number",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "work_email" && body[field]) {
        updates[field] = body[field].trim().toLowerCase();
      } else if (field === "personal_email" && body[field]) {
        updates[field] = body[field].trim().toLowerCase();
      } else if (field === "pan_number" && body[field]) {
        updates[field] = body[field].trim().toUpperCase();
      } else if (typeof body[field] === "string") {
        updates[field] = body[field].trim();
      } else {
        updates[field] = body[field];
      }
    }
  }

  // Duplicate checks on unique fields
  if (updates.aadhaar_number && updates.aadhaar_number !== existing.aadhaar_number) {
    const { data: dup } = await admin.from("employees").select("id").eq("aadhaar_number", updates.aadhaar_number).neq("id", id).limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: "An employee with this Aadhaar number already exists" }, { status: 409 });
    }
  }

  if (updates.pan_number && updates.pan_number !== existing.pan_number) {
    const { data: dup } = await admin.from("employees").select("id").eq("pan_number", updates.pan_number).neq("id", id).limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: "An employee with this PAN number already exists" }, { status: 409 });
    }
  }

  if (updates.work_email && updates.work_email !== existing.work_email) {
    const { data: dup } = await admin.from("employees").select("id").eq("work_email", updates.work_email).neq("id", id).limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: "An employee with this work email already exists" }, { status: 409 });
    }
  }

  if (updates.mobile_number && updates.mobile_number !== existing.mobile_number) {
    const { data: dup } = await admin.from("employees").select("id").eq("mobile_number", updates.mobile_number).neq("id", id).limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: "An employee with this mobile number already exists" }, { status: 409 });
    }
  }

  // Re-link profile if work_email changed
  if (updates.work_email && updates.work_email !== existing.work_email) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", updates.work_email)
      .single();
    updates.linked_profile_id = profile ? profile.id : null;
  }

  updates.updated_at = new Date().toISOString();

  const { data: employee, error } = await admin
    .from("employees")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Employees API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employee });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: employee } = await admin.from("employees").select("user_id, project_id").eq("id", id).single();
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // HR and admin users can delete any employee
  const hrAdmin = await isHrOrAdmin(admin, user.id);
  if (!hrAdmin) {
    const isOwner = employee.user_id === user.id;
    let hasProjectAccess = false;
    if (employee.project_id) {
      const projectRole = await getUserProjectRole(user.id, employee.project_id);
      hasProjectAccess = projectRole && canDeleteProjectData(projectRole);
    }
    if (!isOwner && !hasProjectAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  }

  const { error } = await admin
    .from("employees")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Employees API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

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

  // Check if user has HR role — HR sees all employees
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isHr = profile?.role === "hr";
  const isAdminRole = profile?.role === "admin";

  let query = admin
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (isHr || isAdminRole) {
    // HR and admin users see all employees — no user_id filtering
  } else {
    query = query.eq("user_id", user.id);
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  if (projectId && projectId !== "all") {
    query = query.eq("project_id", projectId);
  }

  const { data: employees, error } = await query;

  if (error) {
    console.error("[Employees API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = employees || [];

  // Enrich with linked profile info
  const linkedIds = all.filter((e) => e.linked_profile_id).map((e) => e.linked_profile_id);
  let profileMap = {};
  if (linkedIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", linkedIds);
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      }
    }
  }

  const enriched = all.map((e) => ({
    ...e,
    linked_profile: e.linked_profile_id ? (profileMap[e.linked_profile_id] || null) : null,
  }));

  const totalEmployees = all.length;
  const activeCount = all.filter((e) => e.employee_status === "active").length;
  const inactiveCount = all.filter((e) => e.employee_status === "inactive").length;
  const onLeaveCount = all.filter((e) => e.employee_status === "on_leave").length;

  return NextResponse.json({
    employees: enriched,
    stats: { totalEmployees, activeCount, inactiveCount, onLeaveCount },
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
    first_name, middle_name, last_name, gender, date_of_birth, date_of_joining,
    designation, department, employee_status, role, work_email, personal_email,
    mobile_number, mobile_number_emergency, personal_address_line_1,
    personal_address_line_2, personal_city, personal_state, personal_postal_code,
    aadhaar_number, pan_number, blood_type, shirt_size, employee_number,
    project_id,
  } = body;

  // Validate required fields
  const required = {
    first_name, last_name, gender, date_of_birth, date_of_joining, employee_status,
    role, work_email, personal_email, mobile_number, mobile_number_emergency,
    personal_address_line_1, personal_address_line_2, personal_city, personal_state,
    personal_postal_code, aadhaar_number, pan_number, blood_type, shirt_size,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v || (typeof v === "string" && !v.trim()))
    .map(([k]) => k);

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  // Check uniqueness across ALL employees
  const { data: existingAadhaar } = await admin
    .from("employees")
    .select("id")
    .eq("aadhaar_number", aadhaar_number.trim())
    .limit(1);
  if (existingAadhaar && existingAadhaar.length > 0) {
    return NextResponse.json({ error: "An employee with this Aadhaar number already exists" }, { status: 409 });
  }

  const { data: existingPan } = await admin
    .from("employees")
    .select("id")
    .eq("pan_number", pan_number.trim().toUpperCase())
    .limit(1);
  if (existingPan && existingPan.length > 0) {
    return NextResponse.json({ error: "An employee with this PAN number already exists" }, { status: 409 });
  }

  const { data: existingEmail } = await admin
    .from("employees")
    .select("id")
    .eq("work_email", work_email.trim().toLowerCase())
    .limit(1);
  if (existingEmail && existingEmail.length > 0) {
    return NextResponse.json({ error: "An employee with this work email already exists" }, { status: 409 });
  }

  const { data: existingMobile } = await admin
    .from("employees")
    .select("id")
    .eq("mobile_number", mobile_number.trim())
    .limit(1);
  if (existingMobile && existingMobile.length > 0) {
    return NextResponse.json({ error: "An employee with this mobile number already exists" }, { status: 409 });
  }

  // Auto-link to user profile by email
  const emailToMatch = work_email.trim().toLowerCase();
  let linkedProfileId = null;
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", emailToMatch)
    .single();
  if (profile) {
    linkedProfileId = profile.id;
  }

  const { data: employee, error } = await admin
    .from("employees")
    .insert({
      user_id: user.id,
      first_name: first_name.trim(),
      middle_name: middle_name ? middle_name.trim() : null,
      last_name: last_name.trim(),
      gender,
      date_of_birth,
      date_of_joining,
      designation: designation ? designation.trim() : null,
      department: department ? department.trim() : null,
      employee_status: employee_status || "active",
      role: role.trim(),
      work_email: emailToMatch,
      personal_email: personal_email.trim().toLowerCase(),
      mobile_number: mobile_number.trim(),
      mobile_number_emergency: mobile_number_emergency.trim(),
      personal_address_line_1: personal_address_line_1.trim(),
      personal_address_line_2: personal_address_line_2.trim(),
      personal_city: personal_city.trim(),
      personal_state: personal_state.trim(),
      personal_postal_code: personal_postal_code.trim(),
      aadhaar_number: aadhaar_number.trim(),
      pan_number: pan_number.trim().toUpperCase(),
      blood_type: blood_type.trim(),
      shirt_size,
      employee_number: employee_number ? employee_number.trim() : null,
      linked_profile_id: linkedProfileId,
      project_id: project_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Employees API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employee, linked: !!linkedProfileId }, { status: 201 });
}

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
  const unassigned = searchParams.get("unassigned");

  let query = admin
    .from("employees")
    .select("id, first_name, last_name, designation, work_email, employee_status, project_id")
    .eq("user_id", user.id);

  if (unassigned === "true") {
    query = query.is("project_id", null);
  } else {
    query = query.eq("project_id", id);
  }

  query = query.order("first_name", { ascending: true });

  const { data: employees, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employees: employees || [] });
}

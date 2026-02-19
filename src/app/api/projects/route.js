import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sync: if this user is an employee assigned to projects but not yet
  // in project_members, auto-add them (handles pre-existing assignments)
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (profile?.email) {
    // Find employee records matching this user's email
    const { data: empRecords } = await admin
      .from("employees")
      .select("id")
      .eq("work_email", profile.email.toLowerCase());

    if (empRecords?.length > 0) {
      const empIds = empRecords.map((e) => e.id);

      // Find projects these employees are assigned to
      const { data: empProjects } = await admin
        .from("project_employees")
        .select("project_id")
        .in("employee_id", empIds);

      if (empProjects?.length > 0) {
        const projectIds = [...new Set(empProjects.map((ep) => ep.project_id))];

        // Check which of these the user is NOT already a member of
        const { data: existingMemberships } = await admin
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id)
          .in("project_id", projectIds);

        const existingProjectIds = new Set((existingMemberships || []).map((m) => m.project_id));
        const missingProjectIds = projectIds.filter((pid) => !existingProjectIds.has(pid));

        if (missingProjectIds.length > 0) {
          await admin.from("project_members").insert(
            missingProjectIds.map((pid) => ({
              project_id: pid,
              user_id: user.id,
              role: "editor",
            }))
          );
        }
      }
    }
  }

  const { data: memberships, error } = await admin
    .from("project_members")
    .select("project_id, role, projects(id, name, description, color, website_url, owner_id, created_at)")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const projects = memberships.map((m) => ({
    ...m.projects,
    role: m.role,
  }));

  return NextResponse.json({ projects });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, color, website_url } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const { data: project, error } = await admin
    .from("projects")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      color: color || "#8fff00",
      website_url: website_url?.trim() || null,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add owner as project member
  await admin.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "owner",
  });

  return NextResponse.json(project, { status: 201 });
}

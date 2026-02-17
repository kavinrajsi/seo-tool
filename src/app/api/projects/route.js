import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, color, website_url, team_id } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const { data: project, error } = await admin
    .from("projects")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      color: color || null,
      website_url: website_url?.trim() || null,
      team_id: team_id || null,
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

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: memberships, error } = await admin
    .from("project_members")
    .select("project_id, role, projects(id, name, description, color, website_url, owner_id, team_id, created_at)")
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

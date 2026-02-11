import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getAccessibleProjectIds } from "@/lib/projectAccess";
import { canCreateProject } from "@/lib/permissions";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let projectIds;
  try {
    projectIds = await getAccessibleProjectIds(user.id);
  } catch {
    return NextResponse.json({ projects: [] });
  }

  if (projectIds.length === 0) {
    return NextResponse.json({ projects: [] });
  }

  const { data, error } = await admin
    .from("projects")
    .select("*, teams(name)")
    .in("id", projectIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ projects: [] });
  }

  return NextResponse.json({ projects: data || [] });
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

  const { name, description, teamId, color, websiteUrl } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  // If team project, verify user has editor+ role on the team
  if (teamId) {
    const { data: membership } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this team" }, { status: 403 });
    }

    if (!canCreateProject(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions to create team project" }, { status: 403 });
    }
  }

  const { data, error } = await admin
    .from("projects")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      team_id: teamId || null,
      owner_id: user.id,
      color: color || "#8fff00",
      website_url: websiteUrl?.trim() || null,
    })
    .select("*, teams(name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

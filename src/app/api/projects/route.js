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

  const insertData = {
    name: name.trim(),
    owner_id: user.id,
  };
  if (description?.trim()) insertData.description = description.trim();
  if (teamId) insertData.team_id = teamId;
  if (color) insertData.color = color;
  if (websiteUrl?.trim()) insertData.website_url = websiteUrl.trim();
  if (body.scanMode === "manual") insertData.scan_mode = "manual";

  let data, error;
  try {
    const result = await admin
      .from("projects")
      .insert(insertData)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } catch (err) {
    console.error("[Projects POST] Insert error:", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  if (error) {
    console.error("[Projects POST] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

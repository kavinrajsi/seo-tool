import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole, getAccessibleProjectIds } from "@/lib/projectAccess";
import { canEditProjectData } from "@/lib/permissions";

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, category, assignee, due_date, priority, status, checklist, comments, link, projectId } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Verify project access if projectId provided
  if (projectId) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  const { data, error } = await admin.from("tasks").insert({
    user_id: user.id,
    project_id: projectId || null,
    title: title.trim(),
    description: description?.trim() || null,
    category: category || "General",
    assignee: assignee?.trim() || null,
    due_date: due_date || null,
    priority: priority || "Medium",
    status: status || "To Do",
    link: link?.trim() || null,
    checklist: checklist || [],
    comments: comments || [],
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";

  let query = admin
    .from("tasks")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (projectId && projectId !== "all") {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    query = query.eq("project_id", projectId);
  } else {
    // All: user's own + accessible project data
    const accessibleIds = await getAccessibleProjectIds(user.id);
    if (accessibleIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project_id.in.(${accessibleIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data });
}

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
  const { name, sourceType, sourceUrl, totalUrls, sitemapCount, urls, projectId } = body;

  if (!name || !urls) {
    return NextResponse.json({ error: "Missing name or urls" }, { status: 400 });
  }

  if (projectId) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  const { data, error } = await admin.from("sitemap_visualizations").insert({
    user_id: user.id,
    project_id: projectId || null,
    name,
    source_type: sourceType || "url",
    source_url: sourceUrl || null,
    total_urls: totalUrls || 0,
    sitemap_count: sitemapCount || 0,
    urls_json: urls,
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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const projectId = searchParams.get("projectId") || "";
  const offset = (page - 1) * limit;

  let query = admin
    .from("sitemap_visualizations")
    .select("id, name, source_type, source_url, total_urls, sitemap_count, project_id, created_at", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (projectId && projectId !== "all") {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    query = query.eq("project_id", projectId);
  } else {
    const accessibleIds = await getAccessibleProjectIds(user.id);
    if (accessibleIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project_id.in.(${accessibleIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data, total: count, page, limit });
}

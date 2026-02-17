import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { name, sourceType, sourceUrl, totalUrls, sitemapCount, urls, project_id } = body;

  if (!name || !urls) {
    return NextResponse.json({ error: "Missing name or urls" }, { status: 400 });
  }

  const { data, error } = await admin.from("sitemap_visualizations").insert({
    user_id: user.id,
    project_id: project_id || null,
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
  const projectId = searchParams.get("project_id");
  const offset = (page - 1) * limit;

  let query = admin
    .from("sitemap_visualizations")
    .select("id, name, source_type, source_url, total_urls, sitemap_count, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (projectId && projectId !== "all") {
    query = query.eq("project_id", projectId);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data, total: count, page, limit });
}

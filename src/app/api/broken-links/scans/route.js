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
  const { domain, totalPages, totalLinks, brokenCount, pagesWithIssues, results } = body;

  if (!domain || !results) {
    return NextResponse.json({ error: "Missing domain or results" }, { status: 400 });
  }

  const { data, error } = await admin.from("broken_link_scans").insert({
    user_id: user.id,
    domain,
    total_pages: totalPages || 0,
    total_links: totalLinks || 0,
    broken_count: brokenCount || 0,
    pages_with_issues: pagesWithIssues || 0,
    results_json: results,
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
  const offset = (page - 1) * limit;

  const { data, error, count } = await admin
    .from("broken_link_scans")
    .select("id, domain, total_pages, total_links, broken_count, pages_with_issues, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scans: data, total: count, page, limit });
}

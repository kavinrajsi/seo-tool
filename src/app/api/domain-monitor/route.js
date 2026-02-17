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
  const { domain, url, status, httpStatus, httpStatusText, responseTime, ssl, dnsOk, redirectUrl, serverHeader, contentType, project_id } = body;

  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  const { data, error } = await admin.from("domain_monitors").insert({
    user_id: user.id,
    project_id: project_id || null,
    domain,
    url: url || null,
    status: status || "unknown",
    http_status: httpStatus || 0,
    http_status_text: httpStatusText || "",
    response_time: responseTime || 0,
    ssl: ssl || false,
    dns_ok: dnsOk !== undefined ? dnsOk : true,
    redirect_url: redirectUrl || null,
    server_header: serverHeader || null,
    content_type: contentType || null,
    last_checked_at: new Date().toISOString(),
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
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const projectId = searchParams.get("project_id");
  const offset = (page - 1) * limit;

  let query = admin
    .from("domain_monitors")
    .select("*", { count: "exact" })
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

  return NextResponse.json({ domains: data, total: count, page, limit });
}

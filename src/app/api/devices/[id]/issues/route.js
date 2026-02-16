import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: issues, error } = await admin
    .from("device_issues")
    .select("*, reporter:employees!device_issues_reported_by_fkey(id, first_name, last_name)")
    .eq("device_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Device Issues API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ issues: issues || [] });
}

export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

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

  const { title, description, reported_by } = body;

  if (!title) {
    return NextResponse.json({ error: "Issue title is required" }, { status: 400 });
  }

  const { data: issue, error } = await admin
    .from("device_issues")
    .insert({
      device_id: id,
      reported_by: reported_by || null,
      title: title.trim(),
      description: description ? description.trim() : null,
      issue_status: "open",
    })
    .select("*, reporter:employees!device_issues_reported_by_fkey(id, first_name, last_name)")
    .single();

  if (error) {
    console.error("[Device Issues API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ issue }, { status: 201 });
}

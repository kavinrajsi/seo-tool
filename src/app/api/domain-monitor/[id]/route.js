import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await admin
    .from("domain_monitors")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const { data: record } = await admin
    .from("domain_monitors")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (record.user_id !== user.id) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const updates = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.httpStatus !== undefined) updates.http_status = body.httpStatus;
  if (body.httpStatusText !== undefined) updates.http_status_text = body.httpStatusText;
  if (body.responseTime !== undefined) updates.response_time = body.responseTime;
  if (body.ssl !== undefined) updates.ssl = body.ssl;
  if (body.dnsOk !== undefined) updates.dns_ok = body.dnsOk;
  if (body.redirectUrl !== undefined) updates.redirect_url = body.redirectUrl;
  if (body.serverHeader !== undefined) updates.server_header = body.serverHeader;
  if (body.contentType !== undefined) updates.content_type = body.contentType;
  updates.last_checked_at = new Date().toISOString();

  const { data, error } = await admin
    .from("domain_monitors")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: record } = await admin
    .from("domain_monitors")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (record.user_id !== user.id) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await admin
    .from("domain_monitors")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

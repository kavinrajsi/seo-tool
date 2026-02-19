import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const VALID_BILLING_CYCLES = ["monthly", "quarterly", "yearly"];
const VALID_STATUSES = ["active", "cancelled", "expired", "inactive"];

async function canAccessRenewal(admin, userId, renewal) {
  // Owner can always access
  if (renewal.user_id === userId) return true;
  // Project members can access project renewals
  if (renewal.project_id) {
    const { data: membership } = await admin
      .from("project_members")
      .select("role")
      .eq("user_id", userId)
      .eq("project_id", renewal.project_id)
      .single();
    if (membership) return true;
  }
  return false;
}

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: renewal, error } = await admin
    .from("software_renewals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !renewal) {
    return NextResponse.json({ error: "Renewal not found" }, { status: 404 });
  }

  if (!(await canAccessRenewal(admin, user.id, renewal))) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  return NextResponse.json({ renewal });
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Access check
  const { data: renewalCheck } = await admin.from("software_renewals").select("user_id, project_id").eq("id", id).single();
  if (!renewalCheck) return NextResponse.json({ error: "Renewal not found" }, { status: 404 });

  if (!(await canAccessRenewal(admin, user.id, renewalCheck))) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.vendor !== undefined) updates.vendor = body.vendor;
  if (body.url !== undefined) updates.url = body.url;
  if (body.category !== undefined) updates.category = body.category;
  if (body.renewal_date !== undefined) updates.renewal_date = body.renewal_date;
  if (body.billing_cycle !== undefined) {
    if (!VALID_BILLING_CYCLES.includes(body.billing_cycle)) {
      return NextResponse.json({ error: "Invalid billing_cycle" }, { status: 400 });
    }
    updates.billing_cycle = body.billing_cycle;
  }
  if (body.cost !== undefined) {
    if (typeof body.cost !== "number" || body.cost < 0) {
      return NextResponse.json({ error: "cost must be a non-negative number" }, { status: 400 });
    }
    updates.cost = body.cost;
  }
  if (body.payment_method !== undefined) updates.payment_method = body.payment_method;
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.license_count !== undefined) updates.license_count = body.license_count;
  if (body.alert_days_before !== undefined) updates.alert_days_before = body.alert_days_before;
  if (body.notes !== undefined) updates.notes = body.notes;
  updates.updated_at = new Date().toISOString();

  const { data: renewal, error } = await admin
    .from("software_renewals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Software Renewals API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ renewal });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Access check
  const { data: renewalDel } = await admin.from("software_renewals").select("user_id, project_id").eq("id", id).single();
  if (!renewalDel) return NextResponse.json({ error: "Renewal not found" }, { status: 404 });

  if (!(await canAccessRenewal(admin, user.id, renewalDel))) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await admin
    .from("software_renewals")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Software Renewals API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

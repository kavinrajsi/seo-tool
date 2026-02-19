import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const VALID_BILLING_CYCLES = ["monthly", "quarterly", "yearly"];
const VALID_STATUSES = ["active", "cancelled", "expired", "inactive"];

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  let query = admin
    .from("software_renewals")
    .select("*")
    .order("renewal_date", { ascending: true });

  if (projectId && projectId !== "all") {
    // Verify user is a member of this project
    const { data: membership } = await admin
      .from("project_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .single();

    if (membership) {
      // Show all project renewals (not just the user's own)
      query = query.eq("project_id", projectId);
    } else {
      query = query.eq("user_id", user.id).eq("project_id", projectId);
    }
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data: renewals, error } = await query;

  if (error) {
    console.error("[Software Renewals API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = renewals || [];

  // Compute stats
  const active = all.filter((r) => r.status === "active");
  const totalActive = active.length;

  // Normalize costs to monthly
  let monthlyCost = 0;
  for (const r of active) {
    const cost = parseFloat(r.cost) || 0;
    if (r.billing_cycle === "monthly") monthlyCost += cost;
    else if (r.billing_cycle === "quarterly") monthlyCost += cost / 3;
    else if (r.billing_cycle === "yearly") monthlyCost += cost / 12;
  }

  // Normalize costs to yearly
  let annualCost = 0;
  for (const r of active) {
    const cost = parseFloat(r.cost) || 0;
    if (r.billing_cycle === "monthly") annualCost += cost * 12;
    else if (r.billing_cycle === "quarterly") annualCost += cost * 4;
    else if (r.billing_cycle === "yearly") annualCost += cost;
  }

  // Count upcoming renewals (active, due within 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingCount = active.filter((r) => {
    const renewalDate = new Date(r.renewal_date + "T00:00:00");
    return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
  }).length;

  return NextResponse.json({
    renewals: all,
    stats: {
      totalActive,
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      annualCost: Math.round(annualCost * 100) / 100,
      upcomingCount,
    },
  });
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

  const { name, renewal_date, billing_cycle, cost, vendor, url, category, payment_method, status, license_count, alert_days_before, notes, project_id } = body;

  if (!name || !renewal_date || !billing_cycle || cost === undefined || cost === null) {
    return NextResponse.json({ error: "name, renewal_date, billing_cycle, and cost are required" }, { status: 400 });
  }

  if (!VALID_BILLING_CYCLES.includes(billing_cycle)) {
    return NextResponse.json({ error: "billing_cycle must be monthly, quarterly, or yearly" }, { status: 400 });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status must be active, cancelled, or expired" }, { status: 400 });
  }

  if (typeof cost !== "number" || cost < 0) {
    return NextResponse.json({ error: "cost must be a non-negative number" }, { status: 400 });
  }

  const insertData = {
    user_id: user.id,
    name,
    vendor: vendor || null,
    url: url || null,
    category: category || null,
    renewal_date,
    billing_cycle,
    cost,
    payment_method: payment_method || null,
    status: status || "active",
    license_count: license_count || 1,
    alert_days_before: alert_days_before !== undefined ? alert_days_before : 7,
    notes: notes || null,
    project_id: project_id || null,
  };

  const { data: renewal, error } = await admin
    .from("software_renewals")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[Software Renewals API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ renewal }, { status: 201 });
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canEditProjectData } from "@/lib/permissions";

const VALID_STATUSES = ["new", "screening", "interview", "offer", "hired", "rejected", "on_hold"];
const VALID_OFFER_STATUSES = ["pending", "sent", "accepted", "declined", "negotiating", "withdrawn"];

async function getNextIds(admin, count) {
  const { data } = await admin
    .from("employees")
    .select("job_id, candidate_id")
    .order("created_at", { ascending: false })
    .limit(200);

  let maxJob = 0;
  let maxCand = 0;
  if (data) {
    for (const row of data) {
      if (row.job_id) {
        const m = row.job_id.match(/\d+$/);
        if (m) maxJob = Math.max(maxJob, parseInt(m[0], 10));
      }
      if (row.candidate_id) {
        const m = row.candidate_id.match(/\d+$/);
        if (m) maxCand = Math.max(maxCand, parseInt(m[0], 10));
      }
    }
  }

  const jobIds = [];
  const candIds = [];
  for (let i = 1; i <= count; i++) {
    jobIds.push(`JOB-${String(maxJob + i).padStart(3, "0")}`);
    candIds.push(`CAND-${String(maxCand + i).padStart(3, "0")}`);
  }
  return { jobIds, candIds };
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

  const { rows, projectId } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
  }

  // HR and admin users bypass project permission checks
  const { data: userProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isHrOrAdminRole = userProfile?.role === "hr" || userProfile?.role === "admin";

  if (projectId && !isHrOrAdminRole) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  const errors = [];
  const validRows = [];

  // Count rows that need auto-generated IDs
  let needJobId = 0;
  let needCandId = 0;
  for (const row of rows) {
    if (!row.job_id) needJobId++;
    if (!row.candidate_id) needCandId++;
  }

  const maxNeeded = Math.max(needJobId, needCandId);
  const { jobIds, candIds } = maxNeeded > 0 ? await getNextIds(admin, maxNeeded) : { jobIds: [], candIds: [] };

  let jobIdx = 0;
  let candIdx = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row.first_name || !row.last_name) {
      errors.push({ row: i + 1, error: "first_name and last_name are required" });
      continue;
    }

    if (row.status && !VALID_STATUSES.includes(row.status)) {
      errors.push({ row: i + 1, error: `Invalid status: ${row.status}` });
      continue;
    }

    if (row.offer_status && !VALID_OFFER_STATUSES.includes(row.offer_status)) {
      errors.push({ row: i + 1, error: `Invalid offer_status: ${row.offer_status}` });
      continue;
    }

    const jobId = row.job_id || jobIds[jobIdx++];
    const candidateId = row.candidate_id || candIds[candIdx++];

    validRows.push({
      user_id: user.id,
      project_id: projectId || null,
      job_id: jobId,
      candidate_id: candidateId,
      first_name: row.first_name.trim(),
      last_name: row.last_name.trim(),
      email: row.email ? row.email.trim().toLowerCase() : null,
      mobile_number: row.mobile_number ? row.mobile_number.trim() : null,
      position: row.position ? row.position.trim() : null,
      job_role: row.job_role ? row.job_role.trim() : null,
      file_url: row.file_url || null,
      portfolio: row.portfolio || null,
      status: row.status || "new",
      offer_status: row.offer_status || null,
      ip_address: row.ip_address || null,
      location: row.location ? row.location.trim() : null,
      source_url: row.source_url || null,
      notes: row.notes || null,
      order_index: row.order_index || 0,
    });
  }

  if (validRows.length === 0) {
    return NextResponse.json({ imported: 0, errors }, { status: 400 });
  }

  const { error } = await admin
    .from("employees")
    .insert(validRows);

  if (error) {
    console.error("[Employees Import] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: validRows.length, errors });
}

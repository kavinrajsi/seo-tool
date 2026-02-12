import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole, getAccessibleProjectIds } from "@/lib/projectAccess";
import { canEditProjectData } from "@/lib/permissions";

function generateId(prefix, length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = prefix + "-";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

  // Check if user has HR role — HR sees all candidates
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isHr = profile?.role === "hr";
  const isAdminRole = profile?.role === "admin";

  let query = admin
    .from("recruitsmart")
    .select("*")
    .order("order_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (isHr || isAdminRole) {
    // HR and admin users see all candidates — no user_id/project filtering
    if (projectId && projectId !== "all" && projectId !== "personal") {
      query = query.eq("project_id", projectId);
    }
  } else if (projectId === "all") {
    const accessibleIds = await getAccessibleProjectIds(user.id);
    if (accessibleIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project_id.in.(${accessibleIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
  } else if (projectId && projectId !== "personal") {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    query = query.eq("project_id", projectId);
  } else {
    query = query.eq("user_id", user.id).is("project_id", null);
  }

  const { data: candidates, error } = await query;

  if (error) {
    console.error("[RecruitSmart API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = candidates || [];

  // Enrich with linked profile info
  const linkedIds = all.filter((e) => e.linked_profile_id).map((e) => e.linked_profile_id);
  let profileMap = {};
  if (linkedIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", linkedIds);
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      }
    }
  }

  const enriched = all.map((e) => ({
    ...e,
    linked_profile: e.linked_profile_id ? (profileMap[e.linked_profile_id] || null) : null,
  }));

  const total = all.length;
  const newCount = all.filter((e) => e.status === "new").length;
  const screeningCount = all.filter((e) => e.status === "screening").length;
  const interviewCount = all.filter((e) => e.status === "interview").length;
  const offerCount = all.filter((e) => e.status === "offer").length;
  const hiredCount = all.filter((e) => e.status === "hired").length;
  const rejectedCount = all.filter((e) => e.status === "rejected").length;
  const offersAccepted = all.filter((e) => e.offer_status === "accepted").length;

  return NextResponse.json({
    employees: enriched,
    stats: { total, newCount, screeningCount, interviewCount, offerCount, hiredCount, rejectedCount, offersAccepted },
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

  const {
    first_name, last_name, email, mobile_number, position, job_role,
    file_url, portfolio, status, offer_status, location, source_url,
    ip_address, notes, job_id, candidate_id, projectId,
  } = body;

  if (!first_name || !last_name) {
    return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
  }

  // Verify project access if projectId provided
  if (projectId) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  // Auto-link to user profile by email
  let linkedProfileId = null;
  if (email) {
    const emailToMatch = email.trim().toLowerCase();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", emailToMatch)
      .single();
    if (profile) {
      linkedProfileId = profile.id;
    }
  }

  const { data: candidate, error } = await admin
    .from("recruitsmart")
    .insert({
      user_id: user.id,
      project_id: projectId || null,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email ? email.trim().toLowerCase() : null,
      mobile_number: mobile_number ? mobile_number.trim() : null,
      position: position ? position.trim() : null,
      job_role: job_role ? job_role.trim() : null,
      file_url: file_url ? file_url.trim() : null,
      portfolio: portfolio ? portfolio.trim() : null,
      status: status || "new",
      offer_status: offer_status || null,
      location: location ? location.trim() : null,
      source_url: source_url ? source_url.trim() : null,
      ip_address: ip_address ? ip_address.trim() : null,
      notes: notes ? notes.trim() : null,
      job_id: job_id ? job_id.trim() : generateId("JOB"),
      candidate_id: candidate_id ? candidate_id.trim() : generateId("CND"),
      linked_profile_id: linkedProfileId,
    })
    .select()
    .single();

  if (error) {
    console.error("[RecruitSmart API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employee: candidate, linked: !!linkedProfileId }, { status: 201 });
}

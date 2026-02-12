import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canEditProjectData, canDeleteProjectData } from "@/lib/permissions";

const VALID_STATUSES = ["new", "screening", "interview", "offer", "hired", "rejected", "on_hold"];
const VALID_OFFER_STATUSES = ["pending", "sent", "accepted", "declined", "negotiating", "withdrawn"];

async function isHrOrAdmin(admin, userId) {
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "hr" || profile?.role === "admin";
}

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: candidate, error } = await admin
    .from("recruitsmart")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // HR and admin users can access any candidate
  const hrAdmin = await isHrOrAdmin(admin, user.id);
  if (!hrAdmin) {
    const isOwner = candidate.user_id === user.id;
    let hasProjectAccess = false;
    if (candidate.project_id) {
      const projectRole = await getUserProjectRole(user.id, candidate.project_id);
      hasProjectAccess = !!projectRole;
    }
    if (!isOwner && !hasProjectAccess) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ employee: candidate });
}

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: existing } = await admin.from("recruitsmart").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  // HR and admin users can edit any candidate
  const hrAdmin = await isHrOrAdmin(admin, user.id);
  if (!hrAdmin) {
    const isOwner = existing.user_id === user.id;
    let hasProjectAccess = false;
    if (existing.project_id) {
      const projectRole = await getUserProjectRole(user.id, existing.project_id);
      hasProjectAccess = projectRole && canEditProjectData(projectRole);
    }
    if (!isOwner && !hasProjectAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  if (body.offer_status && !VALID_OFFER_STATUSES.includes(body.offer_status)) {
    return NextResponse.json({ error: `Invalid offer_status. Must be one of: ${VALID_OFFER_STATUSES.join(", ")}` }, { status: 400 });
  }

  const allowedFields = [
    "first_name", "last_name", "email", "mobile_number", "position",
    "job_role", "file_url", "portfolio", "status", "offer_status",
    "ip_address", "location", "source_url", "notes", "order_index",
    "job_id", "candidate_id",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "email" && body[field]) {
        updates[field] = body[field].trim().toLowerCase();
      } else if (typeof body[field] === "string") {
        updates[field] = body[field].trim();
      } else {
        updates[field] = body[field];
      }
    }
  }

  // Re-link profile if email changed
  if (updates.email && updates.email !== existing.email) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", updates.email)
      .single();
    updates.linked_profile_id = profile ? profile.id : null;
  }

  updates.updated_at = new Date().toISOString();

  const { data: candidate, error } = await admin
    .from("recruitsmart")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[RecruitSmart API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employee: candidate });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: candidate } = await admin.from("recruitsmart").select("user_id, project_id").eq("id", id).single();
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  // HR and admin users can delete any candidate
  const hrAdmin = await isHrOrAdmin(admin, user.id);
  if (!hrAdmin) {
    const isOwner = candidate.user_id === user.id;
    let hasProjectAccess = false;
    if (candidate.project_id) {
      const projectRole = await getUserProjectRole(user.id, candidate.project_id);
      hasProjectAccess = projectRole && canDeleteProjectData(projectRole);
    }
    if (!isOwner && !hasProjectAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  }

  const { error } = await admin
    .from("recruitsmart")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[RecruitSmart API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

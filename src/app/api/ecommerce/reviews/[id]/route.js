import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canEditProjectData, canDeleteProjectData } from "@/lib/permissions";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: review, error } = await admin
    .from("product_reviews")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const isOwner = review.user_id === user.id;
  let hasProjectAccess = false;
  if (review.project_id) {
    const projectRole = await getUserProjectRole(user.id, review.project_id);
    hasProjectAccess = !!projectRole;
  }
  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json({ review });
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
  const { data: existing } = await admin.from("product_reviews").select("user_id, project_id").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const isOwner = existing.user_id === user.id;
  let hasProjectAccess = false;
  if (existing.project_id) {
    const projectRole = await getUserProjectRole(user.id, existing.project_id);
    hasProjectAccess = projectRole && canEditProjectData(projectRole);
  }
  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates = {};
  if (body.status) updates.status = body.status;
  if (body.response_text !== undefined) {
    updates.response_text = body.response_text;
    updates.status = "responded";
    updates.responded_at = new Date().toISOString();
  }
  updates.updated_at = new Date().toISOString();

  const { data: review, error } = await admin
    .from("product_reviews")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Reviews API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review });
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
  const { data: review } = await admin.from("product_reviews").select("user_id, project_id").eq("id", id).single();
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const isOwner = review.user_id === user.id;
  let hasProjectAccess = false;
  if (review.project_id) {
    const projectRole = await getUserProjectRole(user.id, review.project_id);
    hasProjectAccess = projectRole && canDeleteProjectData(projectRole);
  }
  if (!isOwner && !hasProjectAccess) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await admin
    .from("product_reviews")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Reviews API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

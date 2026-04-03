import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function PATCH(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  const isAdmin = emp?.role === "admin" || emp?.role === "owner" || emp?.designation?.toLowerCase().includes("hr");

  const { data: review } = await supabase.from("performance_reviews").select("*").eq("id", id).single();
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Employee self-review
  if (body.action === "self_submit") {
    if (review.employee_id !== emp.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await supabase.from("performance_reviews").update({
      self_rating: body.self_rating,
      self_comments: body.self_comments?.trim() || null,
      status: "self_submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", id);

    // Save goal self-scores
    if (body.goals?.length) {
      for (const g of body.goals) {
        await supabase.from("performance_goals").update({ self_score: g.self_score }).eq("id", g.id);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // Manager/admin review
  if (body.action === "manager_submit") {
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await supabase.from("performance_reviews").update({
      reviewer_id: emp.id,
      manager_rating: body.manager_rating,
      manager_comments: body.manager_comments?.trim() || null,
      final_rating: body.final_rating,
      status: "completed",
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);

    if (body.goals?.length) {
      for (const g of body.goals) {
        await supabase.from("performance_goals").update({ manager_score: g.manager_score }).eq("id", g.id);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // Add goals
  if (body.action === "add_goal") {
    if (!isAdmin && review.employee_id !== emp.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { error } = await supabase.from("performance_goals").insert({
      review_id: id,
      title: body.title?.trim(),
      description: body.description?.trim() || null,
      weight: body.weight || 1,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Delete goal
  if (body.action === "delete_goal") {
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await supabase.from("performance_goals").delete().eq("id", body.goal_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

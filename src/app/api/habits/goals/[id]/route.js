import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function PATCH(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  const body = await req.json();

  // Milestone toggle: { milestone_id, is_done }
  if (body.milestone_id !== undefined) {
    const { error } = await supabase
      .from("habit_goal_milestones")
      .update({ is_done: body.is_done })
      .eq("id", body.milestone_id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Goal field update (progress, status, title, description, color, due_date)
  const allowed = ["title", "description", "progress", "status", "color", "due_date"];
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("habit_goals")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  const { error } = await supabase
    .from("habit_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

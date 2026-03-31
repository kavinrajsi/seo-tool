import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("habit_goals")
    .select("*, habit_goal_milestones(id, title, is_done, sort_order)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sort milestones by sort_order
  const goals = (data ?? []).map((g) => ({
    ...g,
    habit_goal_milestones: (g.habit_goal_milestones ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));

  return NextResponse.json({ goals });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { title, description, color, due_date, milestones } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const { data: goal, error: ge } = await supabase
    .from("habit_goals")
    .insert({ user_id: user.id, title: title.trim(), description, color: color ?? "blue", due_date: due_date ?? null })
    .select("id")
    .single();

  if (ge) return NextResponse.json({ error: ge.message }, { status: 500 });

  if (Array.isArray(milestones) && milestones.length > 0) {
    const rows = milestones
      .filter((m) => m.title?.trim())
      .map((m, i) => ({ goal_id: goal.id, user_id: user.id, title: m.title.trim(), sort_order: i }));
    if (rows.length > 0) await supabase.from("habit_goal_milestones").insert(rows);
  }

  // Refetch with milestones
  const { data: full } = await supabase
    .from("habit_goals")
    .select("*, habit_goal_milestones(id, title, is_done, sort_order)")
    .eq("id", goal.id)
    .single();

  return NextResponse.json({ goal: full });
}

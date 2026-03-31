import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { habit_id, log_date } = await req.json();
  if (!habit_id || !log_date) {
    return NextResponse.json({ error: "habit_id and log_date required" }, { status: 400 });
  }

  // Verify the habit belongs to this user
  const { data: habit } = await supabase
    .from("habits")
    .select("id")
    .eq("id", habit_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

  // Check if log exists — toggle accordingly
  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habit_id)
    .eq("log_date", log_date)
    .maybeSingle();

  if (existing) {
    await supabase.from("habit_logs").delete().eq("id", existing.id);
    return NextResponse.json({ done: false });
  }

  const { error } = await supabase
    .from("habit_logs")
    .insert({ habit_id, user_id: user.id, log_date });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ done: true });
}

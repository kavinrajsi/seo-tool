import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

function getWeekStart(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "stats";
  const weekParam = searchParams.get("week");

  const weekStart = weekParam ? new Date(weekParam) : getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const today = toISODate(new Date());
  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(weekEnd);

  // Fetch active habits
  const { data: habits } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const habitIds = (habits ?? []).map((h) => h.id);
  const totalHabits = habitIds.length;

  if (totalHabits === 0) {
    if (mode === "planner") return NextResponse.json({ logs: {}, week_start: weekStartISO });
    return NextResponse.json({ today_score: 0, weekly_avg: 0, streak: 0, logs_today: {}, today });
  }

  // Fetch logs for the week
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("habit_id, log_date")
    .eq("user_id", user.id)
    .in("habit_id", habitIds)
    .gte("log_date", weekStartISO)
    .lte("log_date", weekEndISO);

  const logRows = logs ?? [];

  if (mode === "planner") {
    // Group by date → array of habit_ids
    const byDate = {};
    for (const row of logRows) {
      if (!byDate[row.log_date]) byDate[row.log_date] = [];
      byDate[row.log_date].push(row.habit_id);
    }
    return NextResponse.json({ logs: byDate, week_start: weekStartISO });
  }

  // Today's logs
  const logsToday = logRows.filter((r) => r.log_date === today);
  const today_score = totalHabits > 0
    ? Math.round((logsToday.length / totalHabits) * 100)
    : 0;

  // Weekly average (score for each day Mon–today in the week)
  const dayScores = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const iso = toISODate(d);
    if (iso > today) break; // don't count future days
    const done = logRows.filter((r) => r.log_date === iso).length;
    dayScores.push(totalHabits > 0 ? (done / totalHabits) * 100 : 0);
  }
  const weekly_avg = dayScores.length > 0
    ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length)
    : 0;

  // Streak — look back up to 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const { data: streakLogs } = await supabase
    .from("habit_logs")
    .select("log_date")
    .eq("user_id", user.id)
    .in("habit_id", habitIds)
    .gte("log_date", toISODate(sixtyDaysAgo))
    .lte("log_date", today);

  const doneByDate = {};
  for (const { log_date } of streakLogs ?? []) {
    doneByDate[log_date] = (doneByDate[log_date] ?? 0) + 1;
  }

  let streak = 0;
  for (let i = 0; i <= 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    if ((doneByDate[iso] ?? 0) > 0) {
      streak++;
    } else {
      // Allow missing today (it's still in progress)
      if (i === 0) continue;
      break;
    }
  }

  const logs_today = {};
  for (const { habit_id } of logsToday) {
    logs_today[habit_id] = true;
  }

  return NextResponse.json({ today_score, weekly_avg, streak, logs_today, today });
}

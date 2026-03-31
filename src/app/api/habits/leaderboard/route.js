import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { createClient } from "@supabase/supabase-js";

function getWeekStart(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISODate(d) { return d.toISOString().slice(0, 10); }

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");
  const weekStart = weekParam ? new Date(weekParam) : getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(weekEnd);
  const today = toISODate(new Date());

  // Use service key to read across all users
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  // Fetch active employees
  const { data: employees } = await admin
    .from("employees")
    .select("first_name, last_name, designation, work_email")
    .or("employee_status.is.null,employee_status.neq.inactive");

  if (!employees?.length) return NextResponse.json({ employees: [], week_start: weekStartISO });

  const emails = employees.map((e) => e.work_email.toLowerCase());

  // Fetch all habits for these employees (user_email stored on habit)
  const { data: habits } = await admin
    .from("habits")
    .select("id, user_id, user_email")
    .eq("is_active", true)
    .in("user_email", emails);

  const habitRows = habits ?? [];

  // Group habits by user_email
  const habitsByEmail = {};
  for (const h of habitRows) {
    const e = h.user_email?.toLowerCase();
    if (!habitsByEmail[e]) habitsByEmail[e] = [];
    habitsByEmail[e].push(h.id);
  }

  // Fetch logs for the week for all relevant habits
  const allHabitIds = habitRows.map((h) => h.id);
  let logRows = [];

  if (allHabitIds.length > 0) {
    const { data: logs } = await admin
      .from("habit_logs")
      .select("habit_id, log_date, user_id")
      .in("habit_id", allHabitIds)
      .gte("log_date", weekStartISO)
      .lte("log_date", weekEndISO);
    logRows = logs ?? [];
  }

  // Group logs by user_id → date → count
  const logsByUserDate = {};
  for (const log of logRows) {
    const uid = log.user_id;
    if (!logsByUserDate[uid]) logsByUserDate[uid] = {};
    logsByUserDate[uid][log.log_date] = (logsByUserDate[uid][log.log_date] ?? 0) + 1;
  }

  // Build user_id → user_email map from habits
  const uidToEmail = {};
  for (const h of habitRows) {
    uidToEmail[h.user_id] = h.user_email?.toLowerCase();
  }

  // Compute scores per employee
  const scored = employees.map((emp) => {
    const email = emp.work_email.toLowerCase();
    const myHabits = habitsByEmail[email] ?? [];
    const totalHabits = myHabits.length;

    // Find user_id for this employee via habits
    const myHabitObj = habitRows.find((h) => h.user_email?.toLowerCase() === email);
    const uid = myHabitObj?.user_id ?? null;
    const myLogs = uid ? (logsByUserDate[uid] ?? {}) : {};

    const dayScores = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const iso = toISODate(d);
      if (iso > today) break;
      const done = myLogs[iso] ?? 0;
      dayScores.push(totalHabits > 0 ? (done / totalHabits) * 100 : 0);
    }

    const weekly_avg = dayScores.length > 0
      ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length)
      : 0;

    const today_score = totalHabits > 0
      ? Math.round(((myLogs[today] ?? 0) / totalHabits) * 100)
      : 0;

    // Simple streak: consecutive days with ≥1 log ending today
    let streak = 0;
    if (uid) {
      for (let i = 0; i <= 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = toISODate(d);
        if ((myLogs[iso] ?? 0) > 0 || i === 0) {
          if ((myLogs[iso] ?? 0) > 0) streak++;
          else continue;
        } else break;
      }
    }

    return {
      email,
      name: `${emp.first_name} ${emp.last_name}`.trim(),
      designation: emp.designation ?? "",
      today_score,
      weekly_avg,
      streak,
      is_current_user: email === user.email?.toLowerCase(),
    };
  });

  scored.sort((a, b) => b.weekly_avg - a.weekly_avg || b.streak - a.streak);
  const ranked = scored.map((e, i) => ({ ...e, rank: i + 1 }));

  return NextResponse.json({ employees: ranked, week_start: weekStartISO });
}

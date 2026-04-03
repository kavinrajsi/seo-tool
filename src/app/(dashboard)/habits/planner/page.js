"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  LoaderIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon,
} from "lucide-react";

const COLORS = {
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  purple: "bg-purple-500",
  amber:  "bg-amber-500",
  rose:   "bg-rose-500",
};

const HEAT_COLORS = [
  "bg-muted/20",          // 0%
  "bg-blue-500/20",       // 1–24%
  "bg-blue-500/40",       // 25–49%
  "bg-blue-500/60",       // 50–74%
  "bg-blue-500/80",       // 75–99%
  "bg-blue-500",          // 100%
];

function heatLevel(done, total) {
  if (!total) return 0;
  const pct = done / total;
  if (pct === 0) return 0;
  if (pct < 0.25) return 1;
  if (pct < 0.5)  return 2;
  if (pct < 0.75) return 3;
  if (pct < 1)    return 4;
  return 5;
}

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

function getWeekStart(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISODate(d) { return d.toISOString().slice(0, 10); }

function fmtWeekRange(ws) {
  const end = new Date(ws);
  end.setDate(ws.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${ws.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export default function PlannerPage() {
  const [habits,    setHabits]    = useState([]);
  const [logs,      setLogs]      = useState({});   // { "YYYY-MM-DD": Set<habit_id> }
  const [loading,   setLoading]   = useState(true);
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const today = toISODate(new Date());

  // 7 day ISO strings for current week
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return toISODate(d);
  });

  const load = useCallback(async (ws) => {
    setLoading(true);
    const h = await authHeader();
    const [hr, sr] = await Promise.all([
      fetch("/api/habits", { headers: h }),
      fetch(`/api/habits/stats?mode=planner&week=${toISODate(ws)}`, { headers: h }),
    ]);
    const [hj, sj] = await Promise.all([hr.json(), sr.json()]);
    setHabits(hj.habits ?? []);

    // Convert planner logs object → { date: Set<habit_id> }
    const logMap = {};
    for (const [date, habitIds] of Object.entries(sj.logs ?? {})) {
      logMap[date] = new Set(habitIds);
    }
    setLogs(logMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(weekStart); }, [weekStart, load]);

  async function toggleCell(habitId, date) {
    const isDone = logs[date]?.has(habitId) ?? false;
    // Optimistic
    setLogs((prev) => {
      const next = { ...prev };
      const set = new Set(next[date] ?? []);
      if (isDone) set.delete(habitId); else set.add(habitId);
      next[date] = set;
      return next;
    });
    const h = await authHeader();
    const res = await fetch("/api/habits/log", {
      method: "POST", headers: h,
      body: JSON.stringify({ habit_id: habitId, log_date: date }),
    });
    if (!res.ok) {
      // Revert
      setLogs((prev) => {
        const next = { ...prev };
        const set = new Set(next[date] ?? []);
        if (isDone) set.add(habitId); else set.delete(habitId);
        next[date] = set;
        return next;
      });
    }
  }

  function prevWeek() {
    setWeekStart((ws) => { const d = new Date(ws); d.setDate(d.getDate() - 7); return d; });
  }
  function nextWeek() {
    setWeekStart((ws) => { const d = new Date(ws); d.setDate(d.getDate() + 7); return d; });
  }

  const isCurrentWeek = toISODate(weekStart) === toISODate(getWeekStart());

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarIcon size={24} className="text-blue-400" /> Weekly Planner
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Your habit completion heatmap</p>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ChevronLeftIcon size={14} />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center">{fmtWeekRange(weekStart)}</span>
          <button onClick={nextWeek} disabled={isCurrentWeek}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRightIcon size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <LoaderIcon size={18} className="animate-spin mr-2" /> Loading…
        </div>
      ) : habits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">No habits yet. Add habits on the Daily Check-in page.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Day header row */}
          <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
            <div className="px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Habit</div>
            {days.map((d) => {
              const isToday = d === today;
              const dt = new Date(d + "T00:00:00");
              return (
                <div key={d} className={`py-2.5 text-center ${isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20 rounded-sm" : ""}`}>
                  <p className={`text-[11px] font-medium uppercase tracking-wide ${isToday ? "text-blue-400" : "text-muted-foreground"}`}>
                    {dt.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={`text-xs mt-0.5 ${isToday ? "text-blue-300 font-semibold" : "text-muted-foreground/70"}`}>
                    {dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Habit rows */}
          {habits.map((habit) => {
            const cs = COLORS[habit.color] ?? COLORS.blue;
            return (
              <div key={habit.id} className="grid border-b border-border/50 last:border-0 hover:bg-muted/5 transition-colors"
                style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
                {/* Habit name */}
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-base shrink-0">{habit.icon}</span>
                  <span className="text-xs font-medium truncate">{habit.title}</span>
                </div>
                {/* Day cells */}
                {days.map((d) => {
                  const isDone = logs[d]?.has(habit.id) ?? false;
                  const isFuture = d > today;
                  return (
                    <div key={d} className="flex items-center justify-center py-1.5">
                      <button
                        onClick={() => !isFuture && toggleCell(habit.id, d)}
                        disabled={isFuture}
                        className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all
                          ${isFuture ? "opacity-20 cursor-not-allowed border-border/30 bg-transparent" :
                            isDone ? `${cs}/30 border-transparent` : "border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-border"}`}>
                        {isDone && <CheckIcon size={13} className={`${cs.replace("bg-", "text-").replace("/30", "")}`} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Heatmap summary row */}
          <div className="grid bg-muted/10 border-t border-border" style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
            <div className="px-4 py-2 flex items-center text-[11px] text-muted-foreground font-medium">Daily Score</div>
            {days.map((d) => {
              const done = logs[d]?.size ?? 0;
              const total = habits.length;
              const level = heatLevel(done, total);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isFuture = d > today;
              return (
                <div key={d} className="flex items-center justify-center py-2">
                  <div className={`h-6 w-6 rounded ${isFuture ? "bg-muted/10" : HEAT_COLORS[level]} flex items-center justify-center`}
                    title={isFuture ? "" : `${pct}%`}>
                    {!isFuture && pct > 0 && <span className="text-[9px] font-bold text-white/80">{pct}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Heat legend */}
      <div className="flex items-center gap-3 self-end">
        <span className="text-xs text-muted-foreground">Less</span>
        {HEAT_COLORS.map((c, i) => (
          <div key={i} className={`h-4 w-4 rounded-sm ${c} border border-border/30`} />
        ))}
        <span className="text-xs text-muted-foreground">More</span>
      </div>
    </div>
  );
}

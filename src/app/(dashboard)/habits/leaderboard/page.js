"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  LoaderIcon, TrophyIcon, ChevronLeftIcon, ChevronRightIcon, FlameIcon,
} from "lucide-react";

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

function fmtWeekRange(weekStart) {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${weekStart.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function MiniBar({ value }) {
  return (
    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

const RANK_STYLES = {
  1: "text-yellow-400 font-bold",
  2: "text-zinc-300 font-bold",
  3: "text-amber-600 font-bold",
};

export default function LeaderboardPage() {
  const [employees, setEmployees] = useState([]);
  const [weekStart,  setWeekStart]  = useState(getWeekStart());
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async (ws) => {
    setLoading(true);
    const h = await authHeader();
    const res = await fetch(`/api/habits/leaderboard?week=${toISODate(ws)}`, { headers: h });
    const json = await res.json();
    setEmployees(json.employees ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(weekStart); }, [weekStart, load]);

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
            <TrophyIcon size={24} className="text-yellow-400" /> Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Team habit completion rankings</p>
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

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[40px_1fr_80px_110px_80px] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <span>#</span>
          <span>Member</span>
          <span className="text-center">Today</span>
          <span className="text-center">Weekly Avg</span>
          <span className="text-center">Streak</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-muted-foreground gap-2">
            <LoaderIcon size={16} className="animate-spin" /> Loading…
          </div>
        ) : employees.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground text-sm">No data for this week.</div>
        ) : (
          employees.map((emp) => (
            <div key={emp.email}
              className={`grid grid-cols-[40px_1fr_80px_110px_80px] gap-4 px-4 py-3 items-center border-b border-border/50 last:border-0 transition-colors
                ${emp.is_current_user ? "bg-primary/10 border-l-2 border-blue-500" : "hover:bg-muted/10"}`}>
              {/* Rank */}
              <span className={`text-sm tabular-nums ${RANK_STYLES[emp.rank] ?? "text-muted-foreground"}`}>
                {emp.rank <= 3 ? (emp.rank === 1 ? "🥇" : emp.rank === 2 ? "🥈" : "🥉") : emp.rank}
              </span>

              {/* Avatar + Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
                  {initials(emp.name)}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${emp.is_current_user ? "text-blue-400" : ""}`}>
                    {emp.name}{emp.is_current_user && <span className="text-[11px] text-muted-foreground ml-1">(you)</span>}
                  </p>
                  {emp.designation && <p className="text-[11px] text-muted-foreground truncate">{emp.designation}</p>}
                </div>
              </div>

              {/* Today score */}
              <div className="text-center">
                <span className={`text-sm font-semibold tabular-nums ${emp.today_score >= 80 ? "text-green-400" : emp.today_score >= 50 ? "text-amber-400" : "text-muted-foreground"}`}>
                  {emp.today_score}%
                </span>
              </div>

              {/* Weekly avg + bar */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold text-blue-400 tabular-nums">{emp.weekly_avg}%</span>
                <MiniBar value={emp.weekly_avg} />
              </div>

              {/* Streak */}
              <div className="flex items-center justify-center gap-1">
                {emp.streak > 0 && <FlameIcon size={12} className="text-orange-400 shrink-0" />}
                <span className={`text-sm font-semibold tabular-nums ${emp.streak > 0 ? "text-orange-400" : "text-muted-foreground"}`}>
                  {emp.streak}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <p className="text-xs text-muted-foreground text-center">
        Weekly Avg = average daily completion rate (Mon–{isCurrentWeek ? "today" : "Sun"})
      </p>
    </div>
  );
}

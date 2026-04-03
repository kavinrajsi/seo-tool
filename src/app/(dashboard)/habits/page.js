"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  CheckIcon, PlusIcon, LoaderIcon, MoreHorizontalIcon,
  FlameIcon, TrendingUpIcon, CheckSquare2Icon, PencilIcon, ArchiveIcon,
} from "lucide-react";

const COLORS = ["blue", "green", "purple", "amber", "rose"];
const EMOJIS = ["✅", "💪", "📚", "🏃", "💧", "🧘", "🎯", "😴", "🥗", "✍️"];

const COLOR_STYLES = {
  blue:   { ring: "ring-blue-500",   bg: "bg-blue-500",   text: "text-blue-400",   pill: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  green:  { ring: "ring-green-500",  bg: "bg-green-500",  text: "text-green-400",  pill: "bg-green-500/10 border-green-500/20 text-green-400" },
  purple: { ring: "ring-purple-500", bg: "bg-purple-500", text: "text-purple-400", pill: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
  amber:  { ring: "ring-amber-500",  bg: "bg-amber-500",  text: "text-amber-400",  pill: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  rose:   { ring: "ring-rose-500",   bg: "bg-rose-500",   text: "text-rose-400",   pill: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
};

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

function toISODate(d = new Date()) { return d.toISOString().slice(0, 10); }

export default function HabitsPage() {
  const [habits,    setHabits]    = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [openMenu,  setOpenMenu]  = useState(null);
  const today = toISODate();

  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fDesc,  setFDesc]  = useState("");
  const [fIcon,  setFIcon]  = useState("✅");
  const [fColor, setFColor] = useState("blue");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const h = await authHeader();
    const [hr, sr] = await Promise.all([
      fetch("/api/habits", { headers: h }),
      fetch("/api/habits/stats", { headers: h }),
    ]);
    const [hj, sj] = await Promise.all([hr.json(), sr.json()]);
    setHabits(hj.habits ?? []);
    setStats(sj);
    setLoading(false);
  }

  async function toggleLog(habit_id) {
    const prevDone = stats?.logs_today?.[habit_id] ?? false;
    // Optimistic update
    setStats((s) => ({
      ...s,
      logs_today: { ...s?.logs_today, [habit_id]: !prevDone },
    }));
    const h = await authHeader();
    const res = await fetch("/api/habits/log", { method: "POST", headers: h, body: JSON.stringify({ habit_id, log_date: today }) });
    if (!res.ok) {
      // Revert
      setStats((s) => ({ ...s, logs_today: { ...s?.logs_today, [habit_id]: prevDone } }));
    } else {
      // Refresh stats score
      fetch("/api/habits/stats", { headers: h }).then((r) => r.json()).then(setStats);
    }
  }

  function openAdd() {
    setEditId(null); setFTitle(""); setFDesc(""); setFIcon("✅"); setFColor("blue"); setShowForm(true);
  }

  function openEdit(h) {
    setEditId(h.id); setFTitle(h.title); setFDesc(h.description ?? ""); setFIcon(h.icon ?? "✅"); setFColor(h.color ?? "blue"); setShowForm(true); setOpenMenu(null);
  }

  async function saveHabit(e) {
    e.preventDefault();
    if (!fTitle.trim()) return;
    setSaving(true);
    const h = await authHeader();
    if (editId) {
      await fetch(`/api/habits/${editId}`, { method: "PATCH", headers: h, body: JSON.stringify({ title: fTitle, description: fDesc, icon: fIcon, color: fColor }) });
    } else {
      await fetch("/api/habits", { method: "POST", headers: h, body: JSON.stringify({ title: fTitle, description: fDesc, icon: fIcon, color: fColor }) });
    }
    setSaving(false); setShowForm(false); load();
  }

  async function archiveHabit(id) {
    const h = await authHeader();
    await fetch(`/api/habits/${id}`, { method: "DELETE", headers: h });
    setOpenMenu(null); load();
  }

  const done = Object.values(stats?.logs_today ?? {}).filter(Boolean).length;
  const total = habits.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const scoreColor = pct >= 80 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-red-400";
  const scoreBg    = pct >= 80 ? "bg-green-500/10 border-green-500/20" : pct >= 50 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground"><LoaderIcon size={18} className="animate-spin mr-2" /> Loading…</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CheckSquare2Icon size={24} className="text-blue-400" /> Daily Habits
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors font-medium">
          <PlusIcon size={13} /> Add Habit
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-xl border p-4 ${scoreBg}`}>
          <p className="text-xs text-muted-foreground mb-1">Today</p>
          <p className={`text-2xl font-bold tabular-nums ${scoreColor}`}>{pct}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">{done} / {total} done</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">7-Day Avg</p>
          <p className="text-2xl font-bold text-blue-400 tabular-nums">{stats?.weekly_avg ?? 0}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">this week</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FlameIcon size={11} className="text-orange-400" /> Streak</p>
          <p className="text-2xl font-bold text-orange-400 tabular-nums">{stats?.streak ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">days</p>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <form onSubmit={saveHabit} className="rounded-xl border border-blue-500/30 bg-card p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold">{editId ? "Edit Habit" : "New Habit"}</h3>
          <div className="flex gap-3">
            <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Habit title…" required
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40" />
            <input value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Description (optional)"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                value={fIcon}
                onChange={(e) => setFIcon(e.target.value)}
                placeholder="😊"
                className="h-8 w-10 rounded-lg border border-border bg-background text-center text-base outline-none focus:ring-2 focus:ring-primary/60"
                maxLength={2}
              />
              <div className="flex gap-1">
                {EMOJIS.map((em) => (
                  <button key={em} type="button" onClick={() => setFIcon(em)}
                    className={`h-8 w-8 rounded-lg text-base flex items-center justify-center transition-colors ${fIcon === em ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted"}`}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1.5 ml-auto">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setFColor(c)}
                  className={`h-5 w-5 rounded-full ${COLOR_STYLES[c].bg} ${fColor === c ? "ring-2 ring-offset-2 ring-offset-card " + COLOR_STYLES[c].ring : ""}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium">
              {saving ? <LoaderIcon size={12} className="animate-spin" /> : <CheckIcon size={12} />}
              {editId ? "Save" : "Create"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Habit list */}
      {habits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">No habits yet. Add your first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map((habit) => {
            const isDone  = stats?.logs_today?.[habit.id] ?? false;
            const cs      = COLOR_STYLES[habit.color] ?? COLOR_STYLES.blue;
            return (
              <div key={habit.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 group hover:bg-muted/10 transition-colors">
                {/* Toggle button */}
                <button onClick={() => toggleLog(habit.id)}
                  className={`h-8 w-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? `${cs.bg} border-transparent` : `border-muted-foreground/40 hover:border-muted-foreground`}`}>
                  {isDone && <CheckIcon size={14} className="text-white" />}
                </button>
                {/* Icon */}
                <span className="text-lg shrink-0">{habit.icon}</span>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>{habit.title}</p>
                  {habit.description && <p className="text-xs text-muted-foreground truncate">{habit.description}</p>}
                </div>
                {/* Color dot */}
                <span className={`h-2 w-2 rounded-full shrink-0 ${cs.bg}`} />
                {/* Menu */}
                <div className="relative shrink-0">
                  <button onClick={() => setOpenMenu(openMenu === habit.id ? null : habit.id)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
                    <MoreHorizontalIcon size={14} />
                  </button>
                  {openMenu === habit.id && (
                    <div className="absolute right-0 top-8 z-10 w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                      <button onClick={() => openEdit(habit)} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors">
                        <PencilIcon size={12} /> Edit
                      </button>
                      <button onClick={() => archiveHabit(habit.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-muted transition-colors">
                        <ArchiveIcon size={12} /> Archive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  PlusIcon, LoaderIcon, CheckIcon, Trash2Icon, XIcon, TargetIcon,
} from "lucide-react";

const COLORS = ["blue", "green", "purple", "amber", "rose"];
const COLOR_STYLES = {
  blue:   { bg: "bg-blue-500",   text: "text-blue-400",   border: "border-blue-500",   pill: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  green:  { bg: "bg-green-500",  text: "text-green-400",  border: "border-green-500",  pill: "bg-green-500/10 border-green-500/20 text-green-400" },
  purple: { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500", pill: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
  amber:  { bg: "bg-amber-500",  text: "text-amber-400",  border: "border-amber-500",  pill: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  rose:   { bg: "bg-rose-500",   text: "text-rose-400",   border: "border-rose-500",   pill: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
};

const STATUS_STYLES = {
  active:    "bg-blue-500/10 border-blue-500/20 text-blue-400",
  completed: "bg-green-500/10 border-green-500/20 text-green-400",
  paused:    "bg-amber-500/10 border-amber-500/20 text-amber-400",
};

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

function ProgressArc({ progress, color }) {
  const r = 16; const cx = 18; const cy = 18;
  const circumference = 2 * Math.PI * r; // ≈ 100.53
  const offset = circumference * (1 - (progress ?? 0) / 100);
  const cs = COLOR_STYLES[color] ?? COLOR_STYLES.blue;
  return (
    <svg width="48" height="48" viewBox="0 0 36 36" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth="3"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 18 18)"
        className={cs.text} />
      <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="600" className="fill-current">{progress}%</text>
    </svg>
  );
}

export default function GoalsPage() {
  const [goals,    setGoals]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showPanel,setShowPanel]= useState(false);
  const [filter,   setFilter]   = useState("all");
  const [saving,   setSaving]   = useState(false);

  // Form
  const [fTitle,      setFTitle]      = useState("");
  const [fDesc,       setFDesc]       = useState("");
  const [fColor,      setFColor]      = useState("blue");
  const [fDue,        setFDue]        = useState("");
  const [fMilestones, setFMilestones] = useState([{ title: "" }]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const h = await authHeader();
    const res = await fetch("/api/habits/goals", { headers: h });
    const json = await res.json();
    setGoals(json.goals ?? []);
    setLoading(false);
  }

  function resetForm() {
    setFTitle(""); setFDesc(""); setFColor("blue"); setFDue(""); setFMilestones([{ title: "" }]);
  }

  async function createGoal(e) {
    e.preventDefault();
    if (!fTitle.trim()) return;
    setSaving(true);
    const h = await authHeader();
    await fetch("/api/habits/goals", {
      method: "POST", headers: h,
      body: JSON.stringify({
        title: fTitle, description: fDesc, color: fColor,
        due_date: fDue || null,
        milestones: fMilestones.filter((m) => m.title.trim()),
      }),
    });
    setSaving(false); setShowPanel(false); resetForm(); load();
  }

  async function toggleMilestone(goal, ms) {
    const newDone = !ms.is_done;
    // Optimistic update
    setGoals((prev) => prev.map((g) => {
      if (g.id !== goal.id) return g;
      const updated = g.habit_goal_milestones.map((m) => m.id === ms.id ? { ...m, is_done: newDone } : m);
      const doneCnt = updated.filter((m) => m.is_done).length;
      const progress = updated.length > 0 ? Math.round((doneCnt / updated.length) * 100) : 0;
      return { ...g, habit_goal_milestones: updated, progress };
    }));
    const h = await authHeader();
    await fetch(`/api/habits/goals/${goal.id}`, {
      method: "PATCH", headers: h,
      body: JSON.stringify({ milestone_id: ms.id, is_done: newDone }),
    });
    // Recalculate & patch progress
    const g = goals.find((g) => g.id === goal.id);
    if (g) {
      const updated = g.habit_goal_milestones.map((m) => m.id === ms.id ? { ...m, is_done: newDone } : m);
      const doneCnt = updated.filter((m) => m.is_done).length;
      const progress = updated.length > 0 ? Math.round((doneCnt / updated.length) * 100) : 0;
      await fetch(`/api/habits/goals/${goal.id}`, {
        method: "PATCH", headers: h, body: JSON.stringify({ progress }),
      });
    }
  }

  async function changeStatus(goalId, status) {
    const h = await authHeader();
    await fetch(`/api/habits/goals/${goalId}`, {
      method: "PATCH", headers: h, body: JSON.stringify({ status }),
    });
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, status } : g));
  }

  async function deleteGoal(id) {
    if (!confirm("Delete this goal?")) return;
    const h = await authHeader();
    await fetch(`/api/habits/goals/${id}`, { method: "DELETE", headers: h });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const filtered = filter === "all" ? goals : goals.filter((g) => g.status === filter);

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground"><LoaderIcon size={18} className="animate-spin mr-2" /> Loading…</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <TargetIcon size={24} className="text-purple-400" /> Goal Tracking
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{goals.length} goals tracked</p>
        </div>
        <button onClick={() => setShowPanel(true)} className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg transition-colors font-medium">
          <PlusIcon size={13} /> New Goal
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1">
        {["all", "active", "completed", "paused"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filter === s ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Goals grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">{filter === "all" ? "No goals yet. Create your first one!" : `No ${filter} goals.`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((goal) => {
            const cs = COLOR_STYLES[goal.color] ?? COLOR_STYLES.blue;
            const ms = goal.habit_goal_milestones ?? [];
            return (
              <div key={goal.id} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
                {/* Color accent bar */}
                <div className={`h-1 w-full ${cs.bg}`} />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold leading-snug">{goal.title}</h3>
                      {goal.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>}
                    </div>
                    <ProgressArc progress={goal.progress} color={goal.color} />
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={goal.status} onChange={(e) => changeStatus(goal.id, e.target.value)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border font-medium outline-none cursor-pointer ${STATUS_STYLES[goal.status] ?? STATUS_STYLES.active} bg-transparent`}>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                    </select>
                    {goal.due_date && (
                      <span className="text-[11px] text-muted-foreground">
                        Due {new Date(goal.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>

                  {/* Milestones */}
                  {ms.length > 0 && (
                    <ul className="flex flex-col gap-1.5 mt-1">
                      {ms.map((m) => (
                        <li key={m.id} className="flex items-center gap-2">
                          <button onClick={() => toggleMilestone(goal, m)}
                            className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${m.is_done ? `${cs.bg} border-transparent` : "border-border hover:border-current"}`}>
                            {m.is_done && <CheckIcon size={10} className="text-white" />}
                          </button>
                          <span className={`text-xs ${m.is_done ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Delete */}
                  <div className="mt-auto pt-2 border-t border-border/50">
                    <button onClick={() => deleteGoal(goal.id)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2Icon size={11} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Goal slide-in panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowPanel(false)} />
          <div className="w-full max-w-md bg-card border-l border-border h-full overflow-y-auto p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">New Goal</h2>
              <button onClick={() => setShowPanel(false)} className="text-muted-foreground hover:text-foreground"><XIcon size={16} /></button>
            </div>
            <form onSubmit={createGoal} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title *</label>
                <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} required placeholder="Goal title…"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/40" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={2} placeholder="What does success look like?"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 resize-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Color</label>
                  <div className="flex gap-1.5">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setFColor(c)}
                        className={`h-5 w-5 rounded-full ${COLOR_STYLES[c].bg} ${fColor === c ? `ring-2 ring-offset-2 ring-offset-card ${COLOR_STYLES[c].border}` : ""}`} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Due date</label>
                  <input type="date" value={fDue} onChange={(e) => setFDue(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 text-foreground" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">Milestones</label>
                {fMilestones.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={m.title} onChange={(e) => setFMilestones((prev) => prev.map((x, j) => j === i ? { title: e.target.value } : x))}
                      placeholder={`Milestone ${i + 1}…`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/40" />
                    {fMilestones.length > 1 && (
                      <button type="button" onClick={() => setFMilestones((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-red-400 transition-colors"><XIcon size={14} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setFMilestones((prev) => [...prev, { title: "" }])}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start">
                  <PlusIcon size={12} /> Add milestone
                </button>
              </div>
              <button type="submit" disabled={saving} className="flex items-center justify-center gap-1.5 text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium mt-2">
                {saving ? <LoaderIcon size={14} className="animate-spin" /> : <CheckIcon size={14} />}
                {saving ? "Saving…" : "Create Goal"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUpIcon, PlusIcon, XIcon, LoaderIcon, CheckIcon, StarIcon,
  UsersIcon, CalendarIcon,
} from "lucide-react";

const RATING_LABELS = { 1: "Needs Improvement", 2: "Below Expectations", 3: "Meets Expectations", 4: "Exceeds Expectations", 5: "Outstanding" };
const RATING_COLORS = { 1: "#ef4444", 2: "#f59e0b", 3: "#3b82f6", 4: "#10b981", 5: "#22c55e" };
const STATUS_STYLES = {
  pending: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  self_submitted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
};

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

function RatingStars({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={disabled} onClick={() => onChange?.(n)}
          className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${n <= (value || 0) ? "text-amber-400" : "text-muted-foreground/30"} ${disabled ? "" : "hover:text-amber-400"}`}>
          <StarIcon size={16} fill={n <= (value || 0) ? "currentColor" : "none"} />
        </button>
      ))}
      {value > 0 && <span className="text-xs text-muted-foreground ml-1">{RATING_LABELS[value]}</span>}
    </div>
  );
}

export default function PerformancePage() {
  const [cycles, setCycles] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myId, setMyId] = useState(null);
  const [activeCycle, setActiveCycle] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create cycle form
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [fName, setFName] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  // Self review form
  const [selfRating, setSelfRating] = useState(0);
  const [selfComments, setSelfComments] = useState("");
  const [goalScores, setGoalScores] = useState({});

  // Manager review form
  const [mgrRating, setMgrRating] = useState(0);
  const [mgrComments, setMgrComments] = useState("");
  const [finalRating, setFinalRating] = useState(0);
  const [mgrGoalScores, setMgrGoalScores] = useState({});

  // Add goal
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDesc, setGoalDesc] = useState("");

  useEffect(() => { load(); }, []);

  async function load(cycleId) {
    setLoading(true);
    const h = await authHeader();
    const url = cycleId ? `/api/performance?cycle_id=${cycleId}` : "/api/performance";
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    setCycles(data.cycles ?? []);
    setReviews(data.reviews ?? []);
    setIsAdmin(data.is_admin ?? false);
    setMyId(data.my_employee_id ?? null);
    if (!activeCycle && data.cycles?.length) {
      const first = data.cycles[0];
      setActiveCycle(first.id);
      if (!cycleId) {
        const res2 = await fetch(`/api/performance?cycle_id=${first.id}`, { headers: h });
        const d2 = await res2.json();
        setReviews(d2.reviews ?? []);
      }
    }
    setLoading(false);
  }

  async function switchCycle(id) {
    setActiveCycle(id);
    setSelected(null);
    const h = await authHeader();
    const res = await fetch(`/api/performance?cycle_id=${id}`, { headers: h });
    const data = await res.json();
    setReviews(data.reviews ?? []);
  }

  async function createCycle(e) {
    e.preventDefault();
    if (!fName.trim() || !fStart || !fEnd) return;
    setSaving(true);
    const h = await authHeader();
    await fetch("/api/performance", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "create_cycle", name: fName, start_date: fStart, end_date: fEnd }),
    });
    setSaving(false);
    setShowCreateCycle(false);
    setFName(""); setFStart(""); setFEnd("");
    load();
  }

  async function initReviews() {
    if (!activeCycle) return;
    if (!confirm("Create review entries for all active employees in this cycle?")) return;
    const h = await authHeader();
    await fetch("/api/performance", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "init_reviews", cycle_id: activeCycle }),
    });
    load(activeCycle);
  }

  function openReview(r) {
    setSelected(r);
    setSelfRating(r.self_rating || 0);
    setSelfComments(r.self_comments || "");
    setMgrRating(r.manager_rating || 0);
    setMgrComments(r.manager_comments || "");
    setFinalRating(r.final_rating || 0);
    const gs = {}; const mg = {};
    (r.performance_goals || []).forEach((g) => { gs[g.id] = g.self_score || 0; mg[g.id] = g.manager_score || 0; });
    setGoalScores(gs);
    setMgrGoalScores(mg);
    setGoalTitle(""); setGoalDesc("");
  }

  async function submitSelf() {
    if (!selected || selfRating === 0) return;
    setSaving(true);
    const h = await authHeader();
    await fetch(`/api/performance/${selected.id}`, {
      method: "PATCH", headers: h,
      body: JSON.stringify({
        action: "self_submit", self_rating: selfRating, self_comments: selfComments,
        goals: Object.entries(goalScores).map(([id, self_score]) => ({ id, self_score })),
      }),
    });
    setSaving(false);
    setSelected(null);
    load(activeCycle);
  }

  async function submitManager() {
    if (!selected || mgrRating === 0 || finalRating === 0) return;
    setSaving(true);
    const h = await authHeader();
    await fetch(`/api/performance/${selected.id}`, {
      method: "PATCH", headers: h,
      body: JSON.stringify({
        action: "manager_submit", manager_rating: mgrRating, manager_comments: mgrComments, final_rating: finalRating,
        goals: Object.entries(mgrGoalScores).map(([id, manager_score]) => ({ id, manager_score })),
      }),
    });
    setSaving(false);
    setSelected(null);
    load(activeCycle);
  }

  async function addGoal() {
    if (!selected || !goalTitle.trim()) return;
    const h = await authHeader();
    await fetch(`/api/performance/${selected.id}`, {
      method: "PATCH", headers: h,
      body: JSON.stringify({ action: "add_goal", title: goalTitle, description: goalDesc }),
    });
    setGoalTitle(""); setGoalDesc("");
    load(activeCycle);
    // Refresh selected
    const h2 = await authHeader();
    const res = await fetch(`/api/performance?cycle_id=${activeCycle}`, { headers: h2 });
    const data = await res.json();
    const updated = (data.reviews ?? []).find((r) => r.id === selected.id);
    if (updated) openReview(updated);
  }

  async function deleteGoal(goalId) {
    if (!selected) return;
    const h = await authHeader();
    await fetch(`/api/performance/${selected.id}`, {
      method: "PATCH", headers: h,
      body: JSON.stringify({ action: "delete_goal", goal_id: goalId }),
    });
    load(activeCycle);
    const h2 = await authHeader();
    const res = await fetch(`/api/performance?cycle_id=${activeCycle}`, { headers: h2 });
    const data = await res.json();
    const updated = (data.reviews ?? []).find((r) => r.id === selected.id);
    if (updated) openReview(updated);
  }

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    self_submitted: reviews.filter((r) => r.status === "self_submitted").length,
    completed: reviews.filter((r) => r.status === "completed").length,
    avgRating: reviews.filter((r) => r.final_rating).reduce((s, r) => s + r.final_rating, 0) / (reviews.filter((r) => r.final_rating).length || 1),
  };

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground"><LoaderIcon size={18} className="animate-spin mr-2" /> Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <TrendingUpIcon size={24} className="text-violet-400" /> Performance Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Review cycles, goals, and ratings</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {activeCycle && (
              <button onClick={initReviews} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                <UsersIcon size={13} /> Init Reviews
              </button>
            )}
            <button onClick={() => setShowCreateCycle(true)} className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-2 rounded-lg transition-colors font-medium">
              <PlusIcon size={13} /> New Cycle
            </button>
          </div>
        )}
      </div>

      {/* Cycle tabs */}
      {cycles.length > 0 && (
        <div className="flex gap-1 overflow-x-auto">
          {cycles.map((c) => (
            <button key={c.id} onClick={() => switchCycle(c.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCycle === c.id ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      {activeCycle && reviews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Reviews</p>
          </div>
          <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-zinc-400">{stats.pending}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.self_submitted}</p>
            <p className="text-xs text-muted-foreground mt-1">Self Submitted</p>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </div>
        </div>
      )}

      {/* Reviews table */}
      {!activeCycle ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">No review cycles yet.{isAdmin ? " Create one to get started." : ""}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">No reviews in this cycle.{isAdmin ? ' Click "Init Reviews" to create entries for all employees.' : ""}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px_80px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Employee</span>
            <span>Self</span>
            <span>Manager</span>
            <span>Final</span>
            <span>Goals</span>
            <span>Status</span>
          </div>
          {reviews.map((r, i) => {
            const emp = r.employees;
            const isMine = r.employee_id === myId;
            return (
              <div key={r.id} onClick={() => openReview(r)}
                className={`grid grid-cols-[1fr_80px_80px_80px_80px_80px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer ${i < reviews.length - 1 ? "border-b border-border/50" : ""} ${isMine ? "border-l-2 border-l-violet-500" : ""}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{emp?.first_name} {emp?.last_name}{isMine ? " (You)" : ""}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{emp?.department || emp?.designation || ""}</p>
                </div>
                <div>{r.self_rating ? <span className="text-xs font-medium" style={{ color: RATING_COLORS[r.self_rating] }}>{r.self_rating}/5</span> : <span className="text-xs text-muted-foreground">—</span>}</div>
                <div>{r.manager_rating ? <span className="text-xs font-medium" style={{ color: RATING_COLORS[r.manager_rating] }}>{r.manager_rating}/5</span> : <span className="text-xs text-muted-foreground">—</span>}</div>
                <div>{r.final_rating ? <span className="text-xs font-bold" style={{ color: RATING_COLORS[r.final_rating] }}>{r.final_rating}/5</span> : <span className="text-xs text-muted-foreground">—</span>}</div>
                <span className="text-xs text-muted-foreground">{(r.performance_goals || []).length}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                  {r.status === "self_submitted" ? "Self Done" : r.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Review detail drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-semibold">{selected.employees?.first_name} {selected.employees?.last_name}</h2>
                <p className="text-xs text-muted-foreground">{selected.employees?.department || ""} · {selected.employees?.designation || ""}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Goals */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Goals ({(selected.performance_goals || []).length})</h3>
                {(selected.performance_goals || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No goals set yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(selected.performance_goals || []).map((g) => (
                      <div key={g.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{g.title}</p>
                            {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                          </div>
                          {isAdmin && <button onClick={() => deleteGoal(g.id)} className="p-1 text-muted-foreground hover:text-red-400 shrink-0"><XIcon size={12} /></button>}
                        </div>
                        <div className="flex gap-4 mt-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Self</p>
                            <RatingStars value={goalScores[g.id] || 0} onChange={selected.employee_id === myId && selected.status === "pending" ? (v) => setGoalScores((p) => ({ ...p, [g.id]: v })) : undefined} disabled={selected.employee_id !== myId || selected.status !== "pending"} />
                          </div>
                          {isAdmin && (
                            <div>
                              <p className="text-[10px] text-muted-foreground">Manager</p>
                              <RatingStars value={mgrGoalScores[g.id] || 0} onChange={selected.status === "self_submitted" ? (v) => setMgrGoalScores((p) => ({ ...p, [g.id]: v })) : undefined} disabled={selected.status !== "self_submitted"} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add goal */}
                {(isAdmin || (selected.employee_id === myId && selected.status === "pending")) && (
                  <div className="flex gap-2 mt-3">
                    <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Goal title..."
                      className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
                    <button onClick={addGoal} disabled={!goalTitle.trim()} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"><PlusIcon size={12} /></button>
                  </div>
                )}
              </div>

              {/* Self Review */}
              {selected.employee_id === myId && selected.status === "pending" && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your Self Review</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Overall Rating *</p>
                      <RatingStars value={selfRating} onChange={setSelfRating} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Comments</p>
                      <textarea value={selfComments} onChange={(e) => setSelfComments(e.target.value)} rows={3}
                        placeholder="Reflect on your performance..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
                    </div>
                    <button onClick={submitSelf} disabled={saving || selfRating === 0}
                      className="w-full flex items-center justify-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                      {saving ? "Submitting..." : "Submit Self Review"}
                    </button>
                  </div>
                </div>
              )}

              {/* Show submitted self review */}
              {selected.self_rating > 0 && (selected.employee_id !== myId || selected.status !== "pending") && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Self Review</h3>
                  <RatingStars value={selected.self_rating} disabled />
                  {selected.self_comments && <p className="text-sm text-muted-foreground mt-2">{selected.self_comments}</p>}
                </div>
              )}

              {/* Manager Review */}
              {isAdmin && selected.status === "self_submitted" && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Manager Review</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Manager Rating *</p>
                      <RatingStars value={mgrRating} onChange={setMgrRating} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Final Rating *</p>
                      <RatingStars value={finalRating} onChange={setFinalRating} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Comments</p>
                      <textarea value={mgrComments} onChange={(e) => setMgrComments(e.target.value)} rows={3}
                        placeholder="Manager feedback..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
                    </div>
                    <button onClick={submitManager} disabled={saving || mgrRating === 0 || finalRating === 0}
                      className="w-full flex items-center justify-center gap-1.5 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                      {saving ? "Submitting..." : "Complete Review"}
                    </button>
                  </div>
                </div>
              )}

              {/* Show completed review */}
              {selected.status === "completed" && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Manager Review</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Manager Rating</p>
                      <RatingStars value={selected.manager_rating} disabled />
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Final Rating</p>
                      <RatingStars value={selected.final_rating} disabled />
                    </div>
                  </div>
                  {selected.manager_comments && <p className="text-sm text-muted-foreground mt-2">{selected.manager_comments}</p>}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create cycle drawer */}
      {showCreateCycle && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowCreateCycle(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">New Review Cycle</h2>
              <button onClick={() => setShowCreateCycle(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <form onSubmit={createCycle} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Cycle Name *</label>
                <input value={fName} onChange={(e) => setFName(e.target.value)} required autoFocus
                  placeholder="e.g. Q2 2026 Review"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Start Date *</label>
                  <input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} required
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 text-foreground" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">End Date *</label>
                  <input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} required min={fStart}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 text-foreground" />
                </div>
              </div>
              <div className="mt-auto pt-4">
                <button type="submit" disabled={saving || !fName.trim() || !fStart || !fEnd}
                  className="w-full flex items-center justify-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                  {saving ? "Creating..." : "Create Cycle"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

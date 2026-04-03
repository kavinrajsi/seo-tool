"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarIcon, PlusIcon, LoaderIcon, XIcon, CheckIcon,
  CalendarDaysIcon,
} from "lucide-react";

const STATUS_COLORS = {
  pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved:  "bg-green-500/10 text-green-400 border-green-500/20",
  rejected:  "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

function businessDays(from, to) {
  if (!from || !to) return 0;
  let count = 0;
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function LeavesPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showApply, setShowApply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fReason, setFReason] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const h = await authHeader();
    const res = await fetch("/api/leaves", { headers: h });
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  }

  async function handleApply(e) {
    e.preventDefault();
    if (!fFrom || !fTo) return;
    setSaving(true);
    setError("");
    const h = await authHeader();
    const res = await fetch("/api/leaves", {
      method: "POST", headers: h,
      body: JSON.stringify({ from_date: fFrom, to_date: fTo, reason: fReason }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setSaving(false);
    setShowApply(false);
    setFFrom(""); setFTo(""); setFReason("");
    load();
  }

  async function cancelRequest(id) {
    if (!confirm("Cancel this leave request?")) return;
    const h = await authHeader();
    await fetch(`/api/leaves/${id}`, { method: "PATCH", headers: h });
    load();
  }

  const calcDays = businessDays(fFrom, fTo);
  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedDays = requests.filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.total_days), 0);

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground"><LoaderIcon size={18} className="animate-spin mr-2" /> Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarIcon size={24} className="text-orange-400" /> My Leaves
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{approvedDays} days taken this year</p>
        </div>
        <button onClick={() => setShowApply(true)} className="flex items-center gap-1.5 text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-lg transition-colors font-medium">
          <PlusIcon size={13} /> Apply for Leave
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{requests.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Requests</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{approvedDays}</p>
          <p className="text-xs text-muted-foreground mt-1">Days Approved</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {["all", "pending", "approved", "rejected", "cancelled"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? "bg-orange-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Requests table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">{requests.length === 0 ? "No leave requests yet." : `No ${filter} requests.`}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[100px_100px_60px_1fr_100px_80px_60px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>From</span>
            <span>To</span>
            <span>Days</span>
            <span>Reason</span>
            <span>Applied</span>
            <span>Status</span>
            <span></span>
          </div>
          {filtered.map((r, i) => (
            <div key={r.id} className={`grid grid-cols-[100px_100px_60px_1fr_100px_80px_60px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
              <span className="text-xs text-muted-foreground">{new Date(r.from_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.to_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span className="text-xs font-medium">{Number(r.total_days)}</span>
              <span className="text-xs text-muted-foreground truncate">{r.reason || "—"}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[r.status]}`}>{r.status}</span>
              <div>
                {r.status === "pending" && (
                  <button onClick={() => cancelRequest(r.id)} className="text-[10px] text-red-400 hover:underline">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply drawer */}
      {showApply && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowApply(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">Apply for Leave</h2>
              <button onClick={() => setShowApply(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">From Date *</label>
                  <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} required
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 text-foreground" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">To Date *</label>
                  <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} required min={fFrom}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 text-foreground" />
                </div>
              </div>

              {fFrom && fTo && calcDays > 0 && (
                <div className="flex items-center gap-2 text-sm rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <CalendarDaysIcon size={14} className="text-muted-foreground" />
                  <span className="font-medium">{calcDays} business day{calcDays !== 1 ? "s" : ""}</span>
                  <span className="text-muted-foreground text-xs">(excluding weekends)</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reason</label>
                <textarea value={fReason} onChange={(e) => setFReason(e.target.value)} rows={3}
                  placeholder="Optional reason for leave..."
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
              </div>

              <div className="mt-auto pt-4">
                <button type="submit" disabled={saving || !fFrom || !fTo}
                  className="w-full flex items-center justify-center gap-1.5 text-sm bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                  {saving ? <LoaderIcon size={14} className="animate-spin" /> : <CheckIcon size={14} />}
                  {saving ? "Applying..." : "Apply for Leave"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

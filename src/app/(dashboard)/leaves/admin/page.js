"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheckIcon, LoaderIcon, XIcon, CheckIcon,
  ClockIcon, UserIcon,
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

export default function LeaveApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const h = await authHeader();
    const res = await fetch("/api/leaves/admin", { headers: h });
    const data = await res.json();
    if (res.ok) {
      setRequests(data.requests ?? []);
      setStats(data.stats ?? { pending: 0, approved: 0, rejected: 0 });
      setCanManage(true);
    }
    setLoading(false);
  }

  async function handleAction(id, action) {
    setSaving(true);
    const h = await authHeader();
    await fetch(`/api/leaves/admin/${id}`, {
      method: "PATCH", headers: h,
      body: JSON.stringify({ action, reviewer_note: reviewNote }),
    });
    setSaving(false);
    setSelected(null);
    setReviewNote("");
    load();
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground"><LoaderIcon size={18} className="animate-spin mr-2" /> Loading...</div>;

  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 gap-3">
        <ShieldCheckIcon size={32} className="text-red-400" />
        <p className="text-sm text-muted-foreground">Only admin, owner, and HR can access leave approvals.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheckIcon size={24} className="text-orange-400" /> Leave Approvals
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Review and manage employee leave requests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          <p className="text-xs text-muted-foreground mt-1">Approved</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground mt-1">Rejected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? "bg-orange-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            {f}{f === "pending" && stats.pending > 0 ? ` (${stats.pending})` : ""}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">No {filter === "all" ? "" : filter + " "}requests.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_60px_1fr_80px_90px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Employee</span>
            <span>From</span>
            <span>To</span>
            <span>Days</span>
            <span>Reason</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {filtered.map((r, i) => (
            <div key={r.id} onClick={() => { setSelected(r); setReviewNote(""); }}
              className={`grid grid-cols-[1fr_100px_100px_60px_1fr_80px_90px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.employees?.first_name} {r.employees?.last_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{r.employees?.department || r.employees?.employee_number || ""}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(r.from_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.to_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span className="text-xs font-medium">{Number(r.total_days)}</span>
              <span className="text-xs text-muted-foreground truncate">{r.reason || "—"}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[r.status]}`}>{r.status}</span>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {r.status === "pending" && (
                  <>
                    <button onClick={() => handleAction(r.id, "approve")} className="p-1 rounded text-green-400 hover:bg-green-500/10 transition-colors" title="Approve"><CheckIcon size={14} /></button>
                    <button onClick={() => handleAction(r.id, "reject")} className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors" title="Reject"><XIcon size={14} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">Leave Request</h2>
              <button onClick={() => setSelected(null)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Employee info */}
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><UserIcon size={16} /></div>
                <div>
                  <p className="text-sm font-medium">{selected.employees?.first_name} {selected.employees?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{selected.employees?.department || ""}{selected.employees?.employee_number ? ` · ${selected.employees.employee_number}` : ""}</p>
                </div>
              </div>

              {/* Leave details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">From</p>
                  <p className="text-sm font-medium">{new Date(selected.from_date).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">To</p>
                  <p className="text-sm font-medium">{new Date(selected.to_date).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Duration</p>
                  <p className="text-sm font-medium">{Number(selected.total_days)} day{Number(selected.total_days) !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Status</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
              </div>

              {selected.reason && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Reason</p>
                  <p className="text-sm">{selected.reason}</p>
                </div>
              )}

              {selected.reviewer_note && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Reviewer Note</p>
                  <p className="text-sm">{selected.reviewer_note}</p>
                </div>
              )}

              {selected.status === "pending" && (
                <div className="flex flex-col gap-3 pt-2 border-t border-border">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
                    <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2}
                      placeholder="Add a note..."
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(selected.id, "approve")} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50">
                      <CheckIcon size={14} /> Approve
                    </button>
                    <button onClick={() => handleAction(selected.id, "reject")} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50">
                      <XIcon size={14} /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

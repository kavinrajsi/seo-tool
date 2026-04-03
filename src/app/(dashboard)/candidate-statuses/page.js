"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  TagIcon, PlusIcon, Trash2Icon, PencilIcon, CheckIcon, XIcon,
  GripVerticalIcon,
} from "lucide-react";

const DEFAULT_COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#06b6d4", "#10b981", "#22c55e", "#ef4444", "#ec4899", "#f97316", "#6366f1"];

export default function CandidateStatusesPage() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); checkAccess(); }, []);

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: emp } = await supabase
      .from("employees").select("role, designation").eq("work_email", user.email).maybeSingle();
    if (emp && (emp.role === "admin" || emp.role === "owner" || emp.designation?.toLowerCase().includes("hr"))) {
      setCanManage(true);
    }
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("candidate_statuses").select("*").order("position");
    if (data) setStatuses(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    const maxPos = statuses.length > 0 ? Math.max(...statuses.map((s) => s.position)) + 1 : 0;
    const { error: e } = await supabase.from("candidate_statuses").insert({ name: newName.trim(), color: newColor, position: maxPos });
    if (e) {
      setError(e.message.includes("candidate_statuses_name_key") ? "Status already exists." : e.message);
    } else {
      setNewName(""); setNewColor("#3b82f6");
      load();
    }
    setAdding(false);
  }

  async function handleUpdate(id) {
    if (!editName.trim()) return;
    setError("");
    const { error: e } = await supabase.from("candidate_statuses").update({ name: editName.trim(), color: editColor }).eq("id", id);
    if (e) {
      setError(e.message.includes("candidate_statuses_name_key") ? "Status already exists." : e.message);
    } else {
      setEditingId(null);
      load();
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete status "${name}"? Candidates with this status will keep it until changed.`)) return;
    await supabase.from("candidate_statuses").delete().eq("id", id);
    load();
  }

  async function moveUp(id) {
    const idx = statuses.findIndex((s) => s.id === id);
    if (idx <= 0) return;
    const prev = statuses[idx - 1];
    const curr = statuses[idx];
    await Promise.all([
      supabase.from("candidate_statuses").update({ position: prev.position }).eq("id", curr.id),
      supabase.from("candidate_statuses").update({ position: curr.position }).eq("id", prev.id),
    ]);
    load();
  }

  async function moveDown(id) {
    const idx = statuses.findIndex((s) => s.id === id);
    if (idx >= statuses.length - 1) return;
    const next = statuses[idx + 1];
    const curr = statuses[idx];
    await Promise.all([
      supabase.from("candidate_statuses").update({ position: next.position }).eq("id", curr.id),
      supabase.from("candidate_statuses").update({ position: curr.position }).eq("id", next.id),
    ]);
    load();
  }

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 gap-3">
        <TagIcon size={32} className="text-red-400" />
        <p className="text-sm text-muted-foreground">Only admin, owner, and HR can manage candidate statuses.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <TagIcon size={24} className="text-cyan-400" /> Candidate Statuses
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Customize your hiring pipeline stages. Drag to reorder.</p>
      </div>

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {/* Add status */}
      <div className="flex gap-2">
        <input
          type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New status name..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
          className="h-9 w-9 rounded-md border border-border bg-background cursor-pointer" />
        <button onClick={handleAdd} disabled={!newName.trim() || adding}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          <PlusIcon size={14} /> {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {/* Status list */}
      {statuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <TagIcon size={28} />
          <p className="text-sm">No statuses yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {statuses.map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between px-4 py-3 ${i < statuses.length - 1 ? "border-b border-border/50" : ""}`}>
              {editingId === s.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                    className="h-7 w-7 rounded border border-border bg-background cursor-pointer" />
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(s.id); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
                  <button onClick={() => handleUpdate(s.id)} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"><CheckIcon size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted/30 rounded transition-colors"><XIcon size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveUp(s.id)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><GripVerticalIcon size={10} /></button>
                      <button onClick={() => moveDown(s.id)} disabled={i === statuses.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><GripVerticalIcon size={10} /></button>
                    </div>
                    <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(s.id); setEditName(s.name); setEditColor(s.color); }} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"><PencilIcon size={14} /></button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

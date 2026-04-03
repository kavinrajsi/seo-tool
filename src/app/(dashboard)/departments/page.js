"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  BuildingIcon,
  PlusIcon,
  Trash2Icon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { loadDepartments(); }, []);

  async function loadDepartments() {
    setLoading(true);
    const { data } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });
    if (data) setDepartments(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    const { error: e } = await supabase.from("departments").insert({ name: newName.trim() });
    if (e) {
      setError(e.message.includes("departments_name_key") ? "Department already exists." : e.message);
    } else {
      setNewName("");
      loadDepartments();
    }
    setAdding(false);
  }

  async function handleUpdate(id) {
    if (!editName.trim()) return;
    setError("");
    const { error: e } = await supabase.from("departments").update({ name: editName.trim() }).eq("id", id);
    if (e) {
      setError(e.message.includes("departments_name_key") ? "Department already exists." : e.message);
    } else {
      setEditingId(null);
      loadDepartments();
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete department "${name}"? Existing employees with this department won't be affected.`)) return;
    await supabase.from("departments").delete().eq("id", id);
    loadDepartments();
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BuildingIcon size={24} className="text-blue-400" />
          Departments
        </h1>
        <p className="text-muted-foreground mt-1">{departments.length} departments</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Add department */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New department name..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || adding}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <PlusIcon size={14} /> {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {/* Department list */}
      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <BuildingIcon size={28} />
          <p className="text-sm">No departments yet. Add your first department above.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {departments.map((d, i) => (
            <div key={d.id} className={`flex items-center justify-between px-4 py-3 ${i < departments.length - 1 ? "border-b border-border/50" : ""}`}>
              {editingId === d.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(d.id); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus
                    className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                  />
                  <button onClick={() => handleUpdate(d.id)} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"><CheckIcon size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted/30 rounded transition-colors"><XIcon size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <BuildingIcon size={14} className="text-blue-400" />
                    </div>
                    <span className="text-sm font-medium">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(d.id); setEditName(d.name); }} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"><PencilIcon size={14} /></button>
                    <button onClick={() => handleDelete(d.id, d.name)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
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

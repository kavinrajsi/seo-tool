"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import {
  MapIcon,
  PlusIcon,
  GripVerticalIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "lucide-react";

const COLUMNS = [
  { id: "planned", label: "Planned", color: "border-t-blue-500" },
  { id: "in_progress", label: "In Progress", color: "border-t-amber-500" },
  { id: "backlog", label: "Backlog", color: "border-t-zinc-500" },
  { id: "done", label: "Done", color: "border-t-emerald-500" },
];

const PRIORITY_COLORS = {
  low: "bg-zinc-500/20 text-zinc-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-red-500/20 text-red-400",
};

export default function Roadmap() {
  const { activeTeam } = useTeam();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addColumn, setAddColumn] = useState("backlog");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [adding, setAdding] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("medium");

  // Drag
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("roadmap_items")
      .select("*")
      .order("position", { ascending: true });

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", user.id).is("team_id", null);
    }

    const { data } = await query;
    if (data) setItems(data);
    setLoading(false);
  }, [user, activeTeam]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newTitle.trim() || !user) return;
    setAdding(true);
    setError("");

    const columnItems = items.filter((i) => i.status === addColumn);
    const maxPos = columnItems.length > 0 ? Math.max(...columnItems.map((i) => i.position)) + 1 : 0;

    const { error: insertErr } = await supabase.from("roadmap_items").insert({
      user_id: user.id,
      team_id: activeTeam?.id || null,
      title: newTitle.trim(),
      description: newDesc.trim(),
      status: addColumn,
      priority: newPriority,
      position: maxPos,
    });

    if (insertErr) setError(insertErr.message);
    else {
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
      setShowAdd(false);
      loadItems();
    }
    setAdding(false);
  }

  async function handleUpdate(id) {
    if (!editTitle.trim()) return;
    setError("");

    const { error: updateErr } = await supabase
      .from("roadmap_items")
      .update({ title: editTitle.trim(), description: editDesc.trim(), priority: editPriority, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) setError(updateErr.message);
    else { setEditingId(null); loadItems(); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    await supabase.from("roadmap_items").delete().eq("id", id);
    loadItems();
  }

  async function moveItem(id, newStatus) {
    const columnItems = items.filter((i) => i.status === newStatus);
    const maxPos = columnItems.length > 0 ? Math.max(...columnItems.map((i) => i.position)) + 1 : 0;

    await supabase
      .from("roadmap_items")
      .update({ status: newStatus, position: maxPos, updated_at: new Date().toISOString() })
      .eq("id", id);

    loadItems();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditPriority(item.priority || "medium");
  }

  function openAdd(columnId) {
    setAddColumn(columnId);
    setShowAdd(true);
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
  }

  // Drag handlers
  function handleDragStart(e, item) {
    setDragging(item.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, columnId) {
    e.preventDefault();
    setDragOver(columnId);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  function handleDrop(e, columnId) {
    e.preventDefault();
    setDragOver(null);
    if (dragging) {
      moveItem(dragging, columnId);
      setDragging(null);
    }
  }

  function getColumnIndex(status) {
    return COLUMNS.findIndex((c) => c.id === status);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MapIcon size={24} className="text-primary" />
            Roadmap
          </h1>
          <p className="text-muted-foreground mt-1">Plan and track feature development.</p>
        </div>
        <button
          onClick={() => openAdd("backlog")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
        >
          <PlusIcon size={16} /> Add Item
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      {/* Add form modal */}
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-medium">Add to {COLUMNS.find((c) => c.id === addColumn)?.label}</h3>
          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={addColumn}
              onChange={(e) => setAddColumn(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {adding ? "Adding..." : "Add"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-16">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[400px]">
          {COLUMNS.map((column) => {
            const columnItems = items.filter((i) => i.status === column.id).sort((a, b) => a.position - b.position);
            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`rounded-xl border-t-2 ${column.color} border border-border bg-card/50 p-3 flex flex-col ${
                  dragOver === column.id ? "bg-primary/5 border-primary/30" : ""
                }`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{column.label}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{columnItems.length}</span>
                  </div>
                  <button
                    onClick={() => openAdd(column.id)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors"
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2">
                  {columnItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={() => setDragging(null)}
                      className={`rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                        dragging === item.id ? "opacity-50" : ""
                      }`}
                    >
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={2}
                            placeholder="Description"
                            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdate(item.id)} className="rounded bg-primary p-1 text-primary-foreground"><CheckIcon size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="rounded border border-border p-1"><XIcon size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium leading-snug">{item.title}</p>
                            <div className="flex gap-0.5 shrink-0">
                              <button onClick={() => startEdit(item)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={12} /></button>
                              <button onClick={() => handleDelete(item.id)} className="p-1 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10"><TrashIcon size={12} /></button>
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
                              {item.priority}
                            </span>
                            {/* Move buttons */}
                            <div className="flex gap-0.5">
                              {getColumnIndex(item.status) > 0 && (
                                <button
                                  onClick={() => moveItem(item.id, COLUMNS[getColumnIndex(item.status) - 1].id)}
                                  className="p-0.5 text-muted-foreground hover:text-foreground rounded hover:bg-accent"
                                  title="Move left"
                                >
                                  <ArrowLeftIcon size={12} />
                                </button>
                              )}
                              {getColumnIndex(item.status) < COLUMNS.length - 1 && (
                                <button
                                  onClick={() => moveItem(item.id, COLUMNS[getColumnIndex(item.status) + 1].id)}
                                  className="p-0.5 text-muted-foreground hover:text-foreground rounded hover:bg-accent"
                                  title="Move right"
                                >
                                  <ArrowRightIcon size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

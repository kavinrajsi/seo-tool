"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  MapIcon,
  PlusIcon,
  PencilIcon,
  XIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  LayoutGridIcon,
  ListIcon,
  GripVerticalIcon,
} from "lucide-react";

const COLUMNS = [
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In Progress" },
  { id: "backlog", label: "Backlog" },
  { id: "done", label: "Done" },
];

const PRIORITY_COLORS = {
  low: "bg-zinc-500/20 text-zinc-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-red-500/20 text-red-400",
};

const STATUS_COLORS = {
  planned: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-amber-500/20 text-amber-400",
  backlog: "bg-zinc-500/20 text-zinc-400",
  done: "bg-emerald-500/20 text-emerald-400",
};

/* ── Draggable Card ───────────────────────────────────────────────── */
function DraggableCard({ item, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-card p-3 transition-shadow ${
        isDragging ? "opacity-40 shadow-lg" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 p-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVerticalIcon size={14} />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(item)}>
          <p className="text-sm font-medium leading-snug mb-1">{item.title}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
              {item.priority}
            </span>
            {item.created_by_name && (
              <span className="text-[10px] text-muted-foreground">{item.created_by_name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Drag Overlay Card (follows cursor) ───────────────────────────── */
function OverlayCard({ item }) {
  return (
    <div className="rounded-lg border border-primary/50 bg-card p-3 shadow-2xl rotate-2 w-[250px]">
      <p className="text-sm font-medium leading-snug">{item.title}</p>
      {item.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
      )}
    </div>
  );
}

/* ── Droppable Column ─────────────────────────────────────────────── */
function DroppableColumn({ column, items, onEdit, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-border bg-card/50 p-3 flex flex-col transition-colors ${
        isOver ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{column.label}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{items.length}</span>
        </div>
        <button onClick={() => onAdd(column.id)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors">
          <PlusIcon size={14} />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} onEdit={onEdit} />
        ))}
        {items.length === 0 && (
          <div className={`flex items-center justify-center h-20 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors ${
            isOver ? "border-primary/50 bg-primary/5" : "border-border/50"
          }`}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function Roadmap() {
  const { activeTeam } = useTeam();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("card");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [drawerItemId, setDrawerItemId] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState("backlog");
  const [formPriority, setFormPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  // Drag overlay
  const [activeItem, setActiveItem] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("roadmap_items")
      .select("*")
      .order("position", { ascending: true });
    if (data) setItems(data);
    setLoading(false);
  }, [user, activeTeam]);

  useEffect(() => { loadItems(); }, [loadItems]);

  function openAddDrawer(columnId) {
    setDrawerMode("add");
    setDrawerItemId(null);
    setFormTitle("");
    setFormDesc("");
    setFormStatus(columnId || "backlog");
    setFormPriority("medium");
    setDrawerOpen(true);
  }

  function openEditDrawer(item) {
    setDrawerMode("edit");
    setDrawerItemId(item.id);
    setFormTitle(item.title);
    setFormDesc(item.description || "");
    setFormStatus(item.status);
    setFormPriority(item.priority || "medium");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerItemId(null);
  }

  async function handleSave() {
    if (!formTitle.trim() || !user) return;
    setSaving(true);
    setError("");

    if (drawerMode === "add") {
      const columnItems = items.filter((i) => i.status === formStatus);
      const maxPos = columnItems.length > 0 ? Math.max(...columnItems.map((i) => i.position)) + 1 : 0;

      const { error: e } = await supabase.from("roadmap_items").insert({
        user_id: user.id,
        team_id: activeTeam?.id || null,
        title: formTitle.trim(),
        description: formDesc.trim(),
        status: formStatus,
        priority: formPriority,
        position: maxPos,
        created_by_name: user.email?.split("@")[0] || user.email || "",
      });
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase
        .from("roadmap_items")
        .update({
          title: formTitle.trim(),
          description: formDesc.trim(),
          status: formStatus,
          priority: formPriority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", drawerItemId);
      if (e) setError(e.message);
    }

    setSaving(false);
    closeDrawer();
    loadItems();
  }

  async function moveItem(id, newStatus) {
    const columnItems = items.filter((i) => i.status === newStatus);
    const maxPos = columnItems.length > 0 ? Math.max(...columnItems.map((i) => i.position)) + 1 : 0;

    // Optimistic update
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: newStatus, position: maxPos } : i));

    await supabase.from("roadmap_items").update({ status: newStatus, position: maxPos, updated_at: new Date().toISOString() }).eq("id", id);
  }

  function handleDragStart(event) {
    const item = event.active.data.current?.item;
    if (item) setActiveItem(item);
  }

  function handleDragEnd(event) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id;
    const targetColumn = over.id;

    // Only move if dropping on a different column
    const item = items.find((i) => i.id === itemId);
    if (item && item.status !== targetColumn && COLUMNS.some((c) => c.id === targetColumn)) {
      moveItem(itemId, targetColumn);
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
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 transition-colors ${viewMode === "card" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Board view"
            >
              <LayoutGridIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="List view"
            >
              <ListIcon size={16} />
            </button>
          </div>
          <button
            onClick={() => openAddDrawer("backlog")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
          >
            <PlusIcon size={16} /> Add Item
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-16">Loading...</div>
      ) : viewMode === "card" ? (
        /* ── Kanban Board with dnd-kit ────────────────────────────── */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[400px]">
            {COLUMNS.map((column) => {
              const columnItems = items.filter((i) => i.status === column.id).sort((a, b) => a.position - b.position);
              return (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  items={columnItems}
                  onEdit={openEditDrawer}
                  onAdd={openAddDrawer}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeItem ? <OverlayCard item={activeItem} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* ── List View ────────────────────────────────────────────── */
        <div className="rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_120px_80px_80px] gap-4 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Title</span>
            <span>Status</span>
            <span>Priority</span>
            <span className="text-right">Actions</span>
          </div>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No items yet.</div>
          ) : (
            <div>
              {items.sort((a, b) => {
                const statusOrder = COLUMNS.map((c) => c.id);
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || a.position - b.position;
              }).map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_120px_80px_80px] gap-4 px-4 py-3 border-b border-border/50 last:border-0 items-center hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${STATUS_COLORS[item.status]}`}>
                    {COLUMNS.find((c) => c.id === item.status)?.label}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${PRIORITY_COLORS[item.priority]}`}>
                    {item.priority}
                  </span>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEditDrawer(item)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Right Drawer ──────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">
                {drawerMode === "add" ? "Add Item" : "Edit Item"}
              </h2>
              <button onClick={closeDrawer} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent">
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Feature title"
                  autoFocus
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe the feature..."
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || saving}
                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : drawerMode === "add" ? "Add Item" : "Save Changes"}
              </button>
              <button onClick={closeDrawer} className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

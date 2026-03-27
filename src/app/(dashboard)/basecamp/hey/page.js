"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  InboxIcon,
  CheckCircle2Icon,
  CalendarIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  SearchIcon,
  RefreshCwIcon,
  XIcon,
  FolderIcon,
  UserIcon,
  ClockIcon,
  CircleDotIcon,
} from "lucide-react";

export default function BasecampHey() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ assignments: 0, schedule: 0, bookmarks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => { loadHey(); }, []);

  async function loadHey() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/basecamp/hey");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items || []);
      setCounts(json.counts || { assignments: 0, schedule: 0, bookmarks: 0 });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const filtered = items.filter((item) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !item.title?.toLowerCase().includes(s) &&
        !item.bucket?.toLowerCase().includes(s) &&
        !item.creator?.toLowerCase().includes(s)
      )
        return false;
    }
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    return true;
  });

  function getIcon(type, status) {
    if (type === "assignment") {
      return status === "completed"
        ? <CheckCircle2Icon size={16} className="text-green-400" />
        : <CircleDotIcon size={16} className="text-blue-400" />;
    }
    if (type === "schedule") return <CalendarIcon size={16} className="text-amber-400" />;
    if (type === "bookmark") return <BookmarkIcon size={16} className="text-purple-400" />;
    return <InboxIcon size={16} className="text-muted-foreground" />;
  }

  function getBadge(item) {
    if (item.type === "assignment") {
      return item.status === "completed"
        ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Completed</span>
        : <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Todo</span>;
    }
    if (item.type === "schedule") {
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Schedule</span>;
    }
    if (item.type === "bookmark") {
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">Bookmark</span>;
    }
    return null;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString();
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading Hey! inbox...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <InboxIcon size={28} />
        <p className="text-sm">{error}</p>
        <button onClick={loadHey} className="text-xs text-primary hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <InboxIcon size={24} className="text-rose-400" />
            Hey!
          </h1>
          <p className="text-muted-foreground mt-1">
            {items.length} items from your Basecamp inbox
          </p>
        </div>
        <button
          onClick={loadHey}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors"
        >
          <RefreshCwIcon size={12} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{counts.assignments}</p>
          <p className="text-xs text-muted-foreground mt-1">Assignments</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{counts.schedule}</p>
          <p className="text-xs text-muted-foreground mt-1">Schedule</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{counts.bookmarks}</p>
          <p className="text-xs text-muted-foreground mt-1">Bookmarks</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, project, or person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { value: "all", label: "All" },
            { value: "assignment", label: "Assignments" },
            { value: "schedule", label: "Schedule" },
            { value: "bookmark", label: "Bookmarks" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                typeFilter === f.value
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Item List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <InboxIcon size={28} />
          <p className="text-sm">{items.length === 0 ? "Your Hey! inbox is empty." : "No matching items."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((item, i) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => setSelectedItem(item)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors ${
                i < filtered.length - 1 ? "border-b border-border/50" : ""
              } ${item.status === "completed" ? "opacity-60" : ""}`}
            >
              {getIcon(item.type, item.status)}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${item.status === "completed" ? "line-through" : ""}`}>
                  {item.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  {getBadge(item)}
                  {item.bucket && (
                    <span className="flex items-center gap-1">
                      <FolderIcon size={10} /> {item.bucket}
                    </span>
                  )}
                  {item.creator && <span>by {item.creator}</span>}
                  {item.due_on && (
                    <span className="flex items-center gap-1">
                      <ClockIcon size={10} /> Due {item.due_on}
                    </span>
                  )}
                  {item.starts_at && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon size={10} /> {formatDate(item.starts_at)}
                    </span>
                  )}
                </div>
              </div>
              {item.app_url && (
                <a
                  href={item.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                  View <ExternalLinkIcon size={10} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedItem(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold truncate">{selectedItem.title}</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium capitalize">{selectedItem.type}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Status</p>
                  <p className="text-sm font-medium capitalize">{selectedItem.status || "active"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Project</p>
                  <p className="text-sm font-medium truncate">{selectedItem.bucket || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Creator</p>
                  <p className="text-sm font-medium truncate">{selectedItem.creator || "—"}</p>
                </div>
              </div>

              {/* Assignees */}
              {selectedItem.assignees?.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-2">Assignees</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.assignees.map((name, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-muted/40 rounded-md px-2 py-1">
                        <UserIcon size={10} /> {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Participants */}
              {selectedItem.participants?.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-2">Participants</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.participants.map((name, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-muted/40 rounded-md px-2 py-1">
                        <UserIcon size={10} /> {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Due / Schedule dates */}
              {selectedItem.due_on && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Due Date</p>
                  <p className="text-sm font-medium">{selectedItem.due_on}</p>
                </div>
              )}
              {selectedItem.starts_at && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Starts</p>
                    <p className="text-sm font-medium">{formatDate(selectedItem.starts_at)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Ends</p>
                    <p className="text-sm font-medium">{selectedItem.ends_at ? formatDate(selectedItem.ends_at) : "—"}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Created</p>
                  <p className="text-sm font-medium">{formatDate(selectedItem.created_at)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Updated</p>
                  <p className="text-sm font-medium">{formatDate(selectedItem.updated_at)}</p>
                </div>
              </div>

              {selectedItem.app_url && (
                <a
                  href={selectedItem.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  Open in Basecamp <ExternalLinkIcon size={14} />
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

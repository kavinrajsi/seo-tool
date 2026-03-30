"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  UsersIcon,
  CalendarIcon,
  CheckSquareIcon,
  FolderIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
  LoaderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "text-red-400" };
  if (diff === 0) return { label: "Due today", color: "text-amber-400" };
  if (diff === 1) return { label: "Due tomorrow", color: "text-yellow-400" };
  if (diff <= 7) return { label: `Due in ${diff}d`, color: "text-blue-400" };
  return { label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "text-muted-foreground" };
}

function PersonCard({ person, todos, search, projectFilter }) {
  const [expanded, setExpanded] = useState(true);

  const filtered = todos.filter((t) => {
    if (projectFilter !== "all" && t.project_name !== projectFilter) return false;
    if (search && !t.content?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (filtered.length === 0) return null;

  const overdue = filtered.filter((t) => t.due_on && new Date(t.due_on) < new Date(new Date().toDateString())).length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Person header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
      >
        {person.avatar_url ? (
          <img src={person.avatar_url} alt={person.name} className="w-8 h-8 rounded-full shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
            {person.name?.[0] || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{person.name}</p>
          {person.title && <p className="text-xs text-muted-foreground truncate">{person.title}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          </span>
          {overdue > 0 && (
            <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium">
              {overdue} overdue
            </span>
          )}
          {expanded ? <ChevronDownIcon size={14} className="text-muted-foreground" /> : <ChevronRightIcon size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {/* Todo list */}
      {expanded && (
        <div className="border-t border-border/60">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_160px_120px] gap-2 px-4 py-2 bg-muted/10 border-b border-border/40">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">What</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Project</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">When</p>
          </div>
          {filtered.map((todo, i) => {
            const due = formatDate(todo.due_on);
            return (
              <div
                key={todo.id}
                className={`grid grid-cols-[1fr_160px_120px] gap-2 items-center px-4 py-2.5 ${i < filtered.length - 1 ? "border-b border-border/30" : ""} hover:bg-muted/10 transition-colors`}
              >
                {/* What */}
                <div className="flex items-center gap-2 min-w-0">
                  <CheckSquareIcon size={13} className="text-muted-foreground shrink-0" />
                  <p className="text-sm truncate">{todo.content}</p>
                  {todo.app_url && (
                    <a
                      href={todo.app_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary shrink-0"
                    >
                      <ExternalLinkIcon size={11} />
                    </a>
                  )}
                </div>

                {/* Project */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <FolderIcon size={11} className="text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground truncate">{todo.project_name || "—"}</p>
                </div>

                {/* When */}
                <div className="flex items-center gap-1.5">
                  <CalendarIcon size={11} className="text-muted-foreground shrink-0" />
                  {due ? (
                    <p className={`text-xs font-medium ${due.color}`}>{due.label}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No due date</p>
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

export default function BeaverPage() {
  const [data, setData] = useState({ assignments: [], total_people: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [personSearch, setPersonSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/basecamp/assignments");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  // Collect all unique projects
  const allProjects = [...new Set(
    data.assignments.flatMap((a) => a.todos.map((t) => t.project_name)).filter(Boolean)
  )].sort();

  // Total task count
  const totalTasks = data.assignments.reduce((sum, a) => sum + a.todos.length, 0);
  const totalOverdue = data.assignments.reduce((sum, a) =>
    sum + a.todos.filter((t) => t.due_on && new Date(t.due_on) < new Date(new Date().toDateString())).length, 0
  );

  // Filter assignments by person search
  const filteredAssignments = data.assignments.filter((a) =>
    !personSearch || a.person.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UsersIcon size={22} className="text-emerald-400" />
            Work Assignments
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Who is doing what and when — across all Basecamp projects
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors disabled:opacity-50"
        >
          {loading ? <LoaderIcon size={12} className="animate-spin" /> : <RefreshCwIcon size={12} />} Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{data.total_people}</p>
          <p className="text-xs text-muted-foreground mt-1">People assigned</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{totalTasks}</p>
          <p className="text-xs text-muted-foreground mt-1">Open tasks</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{totalOverdue}</p>
          <p className="text-xs text-muted-foreground mt-1">Overdue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by person..."
            value={personSearch}
            onChange={(e) => setPersonSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">All projects</option>
          {allProjects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <LoaderIcon size={18} className="animate-spin" /> Loading assignments…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <UsersIcon size={28} />
          <p className="text-sm">{error}</p>
          <button onClick={load} className="text-xs text-primary hover:underline">Retry</button>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <UsersIcon size={28} />
          <p className="text-sm">No assignments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a) => (
            <PersonCard
              key={a.person.id}
              person={a.person}
              todos={a.todos}
              search={search}
              projectFilter={projectFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

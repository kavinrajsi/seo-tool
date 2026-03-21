"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import {
  InboxIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  CircleIcon,
  CircleDotIcon,
  CalendarIcon,
  MessageSquareIcon,
  UserIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
  FilterIcon,
  LayersIcon,
} from "lucide-react";

function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function StatusDot({ completed, status }) {
  if (completed) return <CheckCircle2Icon size={16} className="text-emerald-400" />;
  if (status === "active") return <CircleDotIcon size={16} className="text-blue-400" />;
  return <CircleIcon size={16} className="text-zinc-400" />;
}

export default function BasecampTasks() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("active");
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokenRows } = await supabase
        .from("basecamp_tokens")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!tokenRows?.length) {
        setLoading(false);
        return;
      }

      setConnected(true);

      const { data: stored } = await supabase
        .from("basecamp_todos")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at_basecamp", { ascending: false });

      if (stored) setTodos(stored);
      setLoading(false);
    })();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      const res = await apiFetch("/api/basecamp/todos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTodos(data.todos);
    } catch (err) {
      setError(err.message);
    }
    setSyncing(false);
  }

  // Get unique project names
  const projects = [...new Set(todos.map((t) => t.project_name).filter(Boolean))];

  const filtered = todos.filter((t) => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (projectFilter !== "all" && t.project_name !== projectFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <InboxIcon size={40} className="text-emerald-400" />
        <h2 className="text-lg font-bold">Connect Basecamp</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Connect your Basecamp account in Settings to view tasks.
        </p>
        <a href="/settings" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors">
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <InboxIcon size={20} className="text-emerald-400" />
          <h1 className="text-lg font-semibold">Tasks</h1>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1.5 text-xs outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {/* Status filter */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "completed", label: "Done" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  filter === f.value ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Sync */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md border border-border p-1.5 hover:bg-muted/50 disabled:opacity-50 transition-colors"
          >
            <RefreshCwIcon size={14} className={syncing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 border-b border-red-500/30 bg-red-500/10 px-4 py-2">
          <AlertTriangleIcon size={14} /> {error}
        </div>
      )}

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task list — left panel */}
        <div className={`${selected ? "hidden sm:block sm:w-[400px] lg:w-[450px]" : "w-full"} border-r border-border overflow-y-auto shrink-0`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <InboxIcon size={28} />
              <p className="text-sm">{todos.length === 0 ? "No tasks yet. Click sync to fetch from Basecamp." : "No matching tasks."}</p>
            </div>
          ) : (
            filtered.map((todo) => (
              <button
                key={todo.id}
                onClick={() => setSelected(todo)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${
                  selected?.id === todo.id ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <StatusDot completed={todo.completed} status={todo.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono">{todo.project_name}</span>
                    </div>
                    <p className={`text-sm font-medium leading-snug ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                      {todo.title}
                    </p>
                    {todo.todolist_name && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{todo.todolist_name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{timeAgo(todo.updated_at_basecamp)}</span>
                    {todo.comments_count > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <MessageSquareIcon size={10} /> {todo.comments_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel — right panel */}
        {selected ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-2xl">
              {/* Header */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">{selected.project_name}</span>
                <StatusDot completed={selected.completed} status={selected.status} />
                <button
                  onClick={() => setSelected(null)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground sm:hidden"
                >
                  Back
                </button>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold mb-4">{selected.title}</h2>

              {/* Meta */}
              <div className="flex flex-wrap gap-3 mb-6">
                {selected.todolist_name && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LayersIcon size={12} />
                    {selected.todolist_name}
                  </div>
                )}
                {selected.assignee_name && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserIcon size={12} />
                    {selected.assignee_name}
                  </div>
                )}
                {selected.due_on && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon size={12} />
                    Due {new Date(selected.due_on).toLocaleDateString()}
                  </div>
                )}
                {selected.comments_count > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquareIcon size={12} />
                    {selected.comments_count} comment{selected.comments_count !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Description */}
              {selected.description && (
                <div className="rounded-lg border border-border bg-card p-4 mb-6">
                  <div className="text-sm text-muted-foreground prose-sm" dangerouslySetInnerHTML={{ __html: selected.description }} />
                </div>
              )}

              {/* Status */}
              <div className="rounded-lg border border-border bg-card p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot completed={selected.completed} status={selected.status} />
                    <span className="text-sm font-medium">
                      {selected.completed ? "Completed" : selected.status === "active" ? "Active" : selected.status}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Updated {selected.updated_at_basecamp ? new Date(selected.updated_at_basecamp).toLocaleString() : "—"}
                  </span>
                </div>
              </div>

              {/* Open in Basecamp */}
              {selected.app_url && (
                <a
                  href={selected.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  Open in Basecamp <ExternalLinkIcon size={14} />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden sm:flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <InboxIcon size={32} className="mx-auto mb-2" />
              <p className="text-sm">Select a task to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

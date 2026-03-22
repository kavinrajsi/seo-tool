"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ActivityIcon,
  FileTextIcon,
  CheckSquareIcon,
  UsersIcon,
  FolderIcon,
  ExternalLinkIcon,
  SearchIcon,
  RefreshCwIcon,
} from "lucide-react";

const KIND_LABELS = {
  todo_created: "Todo created",
  todo_completed: "Todo completed",
  todo_uncompleted: "Todo uncompleted",
  todo_changed: "Todo changed",
  todo_assignment_changed: "Todo assigned",
  document_created: "Document created",
  document_changed: "Document changed",
  upload_created: "File uploaded",
  comment_created: "Comment added",
  message_created: "Message posted",
  schedule_entry_created: "Schedule entry created",
  question_answer_created: "Check-in answer",
  client_approval_changed: "Client approval",
  client_forward_created: "Client forward",
  todolist_created: "Todo list created",
};

function getEventIcon(kind) {
  if (kind?.includes("todo")) return CheckSquareIcon;
  if (kind?.includes("document") || kind?.includes("message")) return FileTextIcon;
  if (kind?.includes("upload")) return FolderIcon;
  if (kind?.includes("person") || kind?.includes("assignment")) return UsersIcon;
  return ActivityIcon;
}

function getEventColor(kind) {
  if (kind?.includes("created")) return "text-green-400";
  if (kind?.includes("completed")) return "text-emerald-400";
  if (kind?.includes("changed")) return "text-blue-400";
  if (kind?.includes("deleted") || kind?.includes("uncompleted")) return "text-red-400";
  return "text-muted-foreground";
}

export default function BasecampEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("basecamp_events")
        .select("*")
        .eq("user_id", user.id)
        .order("received_at", { ascending: false })
        .limit(200);

      if (data) setEvents(data);
      setLoading(false);
    })();
  }, []);

  async function handleRefresh() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("basecamp_events")
      .select("*")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(200);

    if (data) setEvents(data);
    setLoading(false);
  }

  const filtered = events.filter((e) => {
    if (search) {
      const s = search.toLowerCase();
      if (!e.recording_title?.toLowerCase().includes(s) && !e.project_name?.toLowerCase().includes(s) && !e.creator_name?.toLowerCase().includes(s)) return false;
    }
    if (typeFilter === "todos" && !e.event_kind?.includes("todo")) return false;
    if (typeFilter === "docs" && !e.event_kind?.includes("document") && !e.event_kind?.includes("upload")) return false;
    if (typeFilter === "messages" && !e.event_kind?.includes("message") && !e.event_kind?.includes("comment")) return false;
    return true;
  });

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ActivityIcon size={24} className="text-emerald-400" />
            Basecamp Activity
          </h1>
          <p className="text-muted-foreground mt-1">{events.length} events received via webhooks</p>
        </div>
        <button onClick={handleRefresh} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <RefreshCwIcon size={14} /> Refresh
        </button>
      </div>

      {/* Search & Filter */}
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
            { value: "todos", label: "Todos" },
            { value: "docs", label: "Docs & Files" },
            { value: "messages", label: "Messages" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                typeFilter === f.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <ActivityIcon size={28} />
          <p className="text-sm">
            {events.length === 0
              ? "No events yet. Register webhooks in Settings to start receiving Basecamp activity."
              : "No matching events."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((event, i) => {
            const Icon = getEventIcon(event.event_kind);
            const color = getEventColor(event.event_kind);
            return (
              <div key={event.id} className={`flex items-start gap-3 px-4 py-3 ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
                <div className={`shrink-0 mt-0.5 ${color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{event.recording_title || "Untitled"}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {KIND_LABELS[event.event_kind] || event.event_kind}
                    </span>
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {event.project_name && (
                      <span className="flex items-center gap-1">
                        <FolderIcon size={10} /> {event.project_name}
                      </span>
                    )}
                    {event.creator_name && <span>by {event.creator_name}</span>}
                    <span>{new Date(event.received_at).toLocaleString()}</span>
                  </div>
                </div>
                {event.app_url && (
                  <a
                    href={event.app_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    View <ExternalLinkIcon size={10} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

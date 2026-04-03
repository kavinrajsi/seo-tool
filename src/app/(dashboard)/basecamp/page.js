"use client";

import { useState, useEffect } from "react";
import {
  ActivityIcon,
  FileTextIcon,
  CheckSquareIcon,
  UsersIcon,
  FolderIcon,
  ExternalLinkIcon,
  SearchIcon,
  RefreshCwIcon,
  MessageSquareIcon,
  UploadIcon,
  CalendarIcon,
  SettingsIcon,
  XIcon,
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
  schedule_entry_created: "Schedule entry",
  question_answer_created: "Check-in answer",
  client_approval_changed: "Client approval",
  client_forward_created: "Client forward",
  todolist_created: "Todo list created",
};

function getEventIcon(kind) {
  if (kind?.includes("todo")) return CheckSquareIcon;
  if (kind?.includes("document")) return FileTextIcon;
  if (kind?.includes("upload")) return UploadIcon;
  if (kind?.includes("message")) return MessageSquareIcon;
  if (kind?.includes("comment")) return MessageSquareIcon;
  if (kind?.includes("schedule")) return CalendarIcon;
  if (kind?.includes("person") || kind?.includes("assignment")) return UsersIcon;
  return ActivityIcon;
}

function getEventColor(kind) {
  if (kind?.includes("completed")) return "text-emerald-400";
  if (kind?.includes("created")) return "text-green-400";
  if (kind?.includes("changed")) return "text-blue-400";
  if (kind?.includes("deleted") || kind?.includes("uncompleted")) return "text-red-400";
  return "text-muted-foreground";
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function groupByDate(events) {
  const groups = {};
  for (const event of events) {
    const date = new Date(event.received_at).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(event);
  }
  return groups;
}

export default function BasecampActivity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch("/api/basecamp/events?filter=all&limit=500");
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch {}
    setLoading(false);
  }

  const filtered = events.filter((e) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !e.recording_title?.toLowerCase().includes(s) &&
        !e.project_name?.toLowerCase().includes(s) &&
        !e.creator_name?.toLowerCase().includes(s) &&
        !e.event_kind?.toLowerCase().includes(s)
      ) return false;
    }
    if (typeFilter === "todos" && !e.event_kind?.includes("todo")) return false;
    if (typeFilter === "docs" && !e.event_kind?.includes("document") && !e.event_kind?.includes("upload")) return false;
    if (typeFilter === "messages" && !e.event_kind?.includes("message") && !e.event_kind?.includes("comment")) return false;
    return true;
  });

  const todoCount = events.filter((e) => e.event_kind?.includes("todo")).length;
  const docCount = events.filter((e) => e.event_kind?.includes("document") || e.event_kind?.includes("upload")).length;
  const msgCount = events.filter((e) => e.event_kind?.includes("message") || e.event_kind?.includes("comment")).length;
  const projectNames = [...new Set(events.map((e) => e.project_name).filter(Boolean))];
  const grouped = groupByDate(filtered);

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
          <p className="text-muted-foreground mt-1">
            {events.length} events across {projectNames.length} projects
          </p>
        </div>
        <button
          onClick={loadEvents}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors"
        >
          <RefreshCwIcon size={12} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{events.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Events</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{todoCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Todos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{docCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Docs & Files</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{msgCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Messages</p>
        </div>
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
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
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

      {/* Events grouped by date */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <ActivityIcon size={32} />
          {events.length === 0 ? (
            <>
              <p className="text-sm font-medium">No events yet</p>
              <p className="text-xs text-center max-w-md">
                Connect Basecamp and register webhooks in Settings to start receiving real-time activity.
              </p>
              <a href="/settings" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors mt-2">
                <SettingsIcon size={14} /> Go to Settings
              </a>
            </>
          ) : (
            <p className="text-sm">No matching events.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateEvents]) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {dateEvents.map((event, i) => {
                  const Icon = getEventIcon(event.event_kind);
                  const color = getEventColor(event.event_kind);
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors ${i < dateEvents.length - 1 ? "border-b border-border/50" : ""}`}
                    >
                      <div className={`shrink-0 mt-0.5 ${color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{event.recording_title || "Untitled"}</span>
                          <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded ${color.replace("text-", "bg-").replace("400", "500/10")} ${color}`}>
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
                          <span>{timeAgo(event.received_at)}</span>
                        </div>
                      </div>
                      {event.app_url && (
                        <a
                          href={event.app_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                        >
                          View <ExternalLinkIcon size={10} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event detail drawer */}
      {selectedEvent && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedEvent(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold truncate">{selectedEvent.recording_title || "Event Detail"}</h2>
              <button onClick={() => setSelectedEvent(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent">
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Event</p>
                  <p className="text-sm font-medium">{KIND_LABELS[selectedEvent.event_kind] || selectedEvent.event_kind}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium">{selectedEvent.recording_type || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Project</p>
                  <p className="text-sm font-medium truncate">{selectedEvent.project_name || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">By</p>
                  <p className="text-sm font-medium truncate">{selectedEvent.creator_name || "—"}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Received</p>
                <p className="text-sm font-medium">{new Date(selectedEvent.received_at).toLocaleString()}</p>
              </div>
              {selectedEvent.app_url && (
                <a href={selectedEvent.app_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                  Open in Basecamp <ExternalLinkIcon size={14} />
                </a>
              )}
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Raw payload</summary>
                <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-4 border border-border">
                  {JSON.stringify(selectedEvent.raw_payload, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

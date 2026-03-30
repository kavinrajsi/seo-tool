"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  BellIcon,
  CheckSquareIcon,
  FileTextIcon,
  MessageSquareIcon,
  UploadIcon,
  CalendarIcon,
  ActivityIcon,
  UsersIcon,
  XIcon,
  ExternalLinkIcon,
  LoaderIcon,
} from "lucide-react";

function getEventIcon(kind) {
  if (kind?.includes("todo")) return CheckSquareIcon;
  if (kind?.includes("document")) return FileTextIcon;
  if (kind?.includes("upload")) return UploadIcon;
  if (kind?.includes("message") || kind?.includes("comment")) return MessageSquareIcon;
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
  return `${days}d ago`;
}

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
  todolist_created: "Todo list created",
};

export function BasecampNotificationMenu() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setSelected(null);
        setSubscription(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Load events when menu opens
  useEffect(() => {
    if (open && events.length === 0) fetchEvents();
  }, [open]);

  async function fetchEvents() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("basecamp_events")
      .select("id, event_kind, recording_title, recording_id, project_name, creator_name, app_url, received_at")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(20);

    if (data) setEvents(data);
    setLoading(false);
  }

  async function loadSubscription(event) {
    setSelected(event);
    setSubscription(null);
    if (!event.recording_id) return;

    setSubLoading(true);
    try {
      const res = await fetch(`/api/basecamp/subscriptions?recording_id=${event.recording_id}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch {}
    setSubLoading(false);
  }

  // Count events from last 24h as "unread"
  const unreadCount = events.filter((e) => {
    return new Date() - new Date(e.received_at) < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen((v) => !v); setSelected(null); setSubscription(null); }}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        aria-label="Basecamp notifications"
      >
        <BellIcon size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-xl border border-border bg-card shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold flex items-center gap-2">
              <BellIcon size={14} className="text-emerald-400" />
              Basecamp Notifications
            </span>
            <button
              onClick={() => { setOpen(false); setSelected(null); setSubscription(null); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon size={14} />
            </button>
          </div>

          {/* Event list or subscription detail */}
          {selected ? (
            <div className="flex flex-col">
              {/* Back + title */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                <button
                  onClick={() => { setSelected(null); setSubscription(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
                <span className="text-xs font-medium truncate text-foreground">{selected.recording_title || "Untitled"}</span>
              </div>

              <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Event</p>
                    <p className="font-medium truncate">{KIND_LABELS[selected.event_kind] || selected.event_kind}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Project</p>
                    <p className="font-medium truncate">{selected.project_name || "—"}</p>
                  </div>
                </div>

                {/* Subscription info */}
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Subscribers</p>
                  {subLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LoaderIcon size={12} className="animate-spin" /> Loading…
                    </div>
                  ) : !selected.recording_id ? (
                    <p className="text-xs text-muted-foreground">No recording ID available</p>
                  ) : subscription ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        {subscription.count ?? subscription.subscribers?.length ?? 0} subscriber(s)
                        {subscription.subscribed !== undefined && (
                          <span className={`ml-2 font-medium ${subscription.subscribed ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {subscription.subscribed ? "· You're subscribed" : "· Not subscribed"}
                          </span>
                        )}
                      </p>
                      {subscription.subscribers?.slice(0, 5).map((s) => (
                        <div key={s.id} className="flex items-center gap-2">
                          {s.avatar_url ? (
                            <img src={s.avatar_url} alt={s.name} className="w-5 h-5 rounded-full" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                              {s.name?.[0] || "?"}
                            </div>
                          )}
                          <span className="text-xs truncate">{s.name}</span>
                        </div>
                      ))}
                      {(subscription.subscribers?.length ?? 0) > 5 && (
                        <p className="text-[10px] text-muted-foreground">+{subscription.subscribers.length - 5} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Could not load subscribers</p>
                  )}
                </div>

                {selected.app_url && (
                  <a
                    href={selected.app_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    Open in Basecamp <ExternalLinkIcon size={10} />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
                  <LoaderIcon size={14} className="animate-spin" /> Loading…
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                  <BellIcon size={24} />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                events.map((event, i) => {
                  const Icon = getEventIcon(event.event_kind);
                  const color = getEventColor(event.event_kind);
                  const isRecent = new Date() - new Date(event.received_at) < 24 * 60 * 60 * 1000;
                  return (
                    <button
                      key={event.id}
                      onClick={() => loadSubscription(event)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors ${i < events.length - 1 ? "border-b border-border/40" : ""}`}
                    >
                      <div className={`shrink-0 mt-0.5 ${color}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{event.recording_title || "Untitled"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {KIND_LABELS[event.event_kind] || event.event_kind}
                          {event.project_name && ` · ${event.project_name}`}
                        </p>
                      </div>
                      <span className={`text-[10px] shrink-0 mt-0.5 ${isRecent ? "text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                        {timeAgo(event.received_at)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Footer */}
          {!selected && events.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border">
              <a href="/basecamp" className="text-xs text-primary hover:underline">
                View all activity →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

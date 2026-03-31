"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import {
  CalendarDaysIcon, MapPinIcon, PlusIcon, LoaderIcon, XIcon,
  CheckIcon, UsersIcon, UserXIcon, Trash2Icon,
} from "lucide-react";

const COVER_EMOJIS = ["🎉", "🎂", "🏆", "🌟", "🎤", "🏃", "🍕", "📅", "🤝", "🎊", "🌍", "💡"];

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

function fmtDate(dt) {
  return new Date(dt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtDateTime(dt) {
  return new Date(dt).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function initials(name) {
  return (name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join("");
}

function getAccent(event_date) {
  const diff = (new Date(event_date) - new Date()) / 86400000;
  if (diff < 0)  return { bg: "bg-zinc-500/10",  bar: "bg-zinc-500" };
  if (diff <= 3) return { bg: "bg-red-500/10",   bar: "bg-red-500" };
  if (diff <= 7) return { bg: "bg-amber-500/10", bar: "bg-amber-500" };
  return           { bg: "bg-blue-500/10",   bar: "bg-blue-500" };
}

function Avatar({ name, size = "h-8 w-8 text-xs" }) {
  return (
    <div className={`${size} rounded-full bg-muted flex items-center justify-center font-semibold text-foreground shrink-0`}>
      {initials(name)}
    </div>
  );
}

function AttendeeList({ registrations, status }) {
  const list = registrations.filter((r) => r.status === status);
  const isGoing = status === "going";
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
        {isGoing ? <UsersIcon size={12} /> : <UserXIcon size={12} />}
        {isGoing ? "Going" : "Not Going"} ({list.length})
      </h3>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">No one yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {list.map((reg) => (
            <li key={reg.id} className="flex items-center gap-2.5">
              <Avatar name={reg.user_name} size="h-7 w-7 text-[11px]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{reg.user_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{reg.user_email}</p>
              </div>
              <span className={`text-[10px] border rounded-full px-2 py-0.5 shrink-0 ${
                isGoing
                  ? "text-green-400 bg-green-500/10 border-green-500/20"
                  : "text-red-400 bg-red-500/10 border-red-500/20"
              }`}>
                {isGoing ? "Going" : "Not Going"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function EventsPage() {
  const { activeTeam } = useTeam();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [filter, setFilter] = useState("all");

  // Drawer
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [drawerDetail, setDrawerDetail] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fDate, setFDate] = useState("");
  const [fEndDate, setFEndDate] = useState("");
  const [fEmoji, setFEmoji] = useState("🎉");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const load = useCallback(async () => {
    if (!activeTeam?.id) { setLoading(false); return; }
    setLoading(true);
    const h = await authHeader();
    const res = await fetch(`/api/events?team_id=${activeTeam.id}`, { headers: h });
    const json = await res.json();
    setEvents(json.events ?? []);
    setCanCreate(json.can_create ?? false);
    setLoading(false);
  }, [activeTeam?.id]);

  useEffect(() => { load(); }, [load]);

  async function openDrawer(ev) {
    setSelectedEvent(ev);
    setDrawerDetail(null);
    setDrawerLoading(true);
    const h = await authHeader();
    const res = await fetch(`/api/events/${ev.id}`, { headers: h });
    const json = await res.json();
    setDrawerDetail(json.event ?? null);
    setDrawerLoading(false);
  }

  async function toggleRSVP(eventId, currentStatus, newStatus, e) {
    e?.stopPropagation();
    const sendStatus = currentStatus === newStatus ? null : newStatus;

    // Optimistic update
    setEvents((prev) =>
      prev.map((ev) => ev.id === eventId ? { ...ev, my_status: sendStatus } : ev)
    );
    if (selectedEvent?.id === eventId) {
      setSelectedEvent((prev) => ({ ...prev, my_status: sendStatus }));
    }

    const h = await authHeader();
    await fetch(`/api/events/${eventId}/register`, {
      method: "POST", headers: h,
      body: JSON.stringify({ status: sendStatus }),
    });

    // Refresh counts + drawer
    load();
    if (selectedEvent?.id === eventId) {
      const res = await fetch(`/api/events/${eventId}`, { headers: h });
      const json = await res.json();
      setDrawerDetail(json.event ?? null);
    }
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    const h = await authHeader();
    await fetch(`/api/events/${id}`, { method: "DELETE", headers: h });
    setSelectedEvent(null);
    setDrawerDetail(null);
    load();
  }

  async function createEvent(e) {
    e.preventDefault();
    if (!fTitle.trim() || !fDate) return;
    setSaving(true);
    const h = await authHeader();
    await fetch("/api/events", {
      method: "POST", headers: h,
      body: JSON.stringify({
        team_id: activeTeam?.id,
        title: fTitle,
        description: fDesc || null,
        location: fLocation || null,
        event_date: fDate,
        end_date: fEndDate || null,
        cover_emoji: fEmoji,
      }),
    });
    setSaving(false);
    setShowCreate(false);
    setFTitle(""); setFDesc(""); setFLocation(""); setFDate(""); setFEndDate(""); setFEmoji("🎉");
    load();
  }

  const now = new Date();
  const filtered = events.filter((ev) => {
    const d = new Date(ev.event_date);
    if (filter === "upcoming") return d >= now;
    if (filter === "past") return d < now;
    return true;
  });

  if (!activeTeam) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground text-sm">
        Select a team to view events.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarDaysIcon size={24} className="text-blue-400" /> Events
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Team events and RSVPs</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors font-medium"
          >
            <PlusIcon size={13} /> New Event
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {["all", "upcoming", "past"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors
              ${filter === f ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <LoaderIcon size={18} className="animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {filter === "all" ? "No events yet." : `No ${filter} events.`}
            {canCreate && filter === "all" && " Create the first one!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ev) => {
            const isCreator = ev.created_by === user?.id;
            const accent = getAccent(ev.event_date);
            return (
              <div
                key={ev.id}
                onClick={() => openDrawer(ev)}
                className="rounded-xl border border-border bg-card overflow-hidden flex flex-col cursor-pointer hover:border-border/80 hover:shadow-md transition-all"
              >
                {/* Emoji cover */}
                <div className={`h-20 flex items-center justify-center text-4xl ${accent.bg}`}>
                  {ev.cover_emoji}
                </div>
                <div className={`h-0.5 w-full ${accent.bar}`} />

                <div className="p-4 flex flex-col gap-2 flex-1">
                  {/* Date row */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDaysIcon size={11} />
                    {fmtDate(ev.event_date)}
                    <span className="text-muted-foreground/60">·</span>
                    {fmtTime(ev.event_date)}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2">{ev.title}</h3>

                  {/* Location */}
                  {ev.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPinIcon size={11} />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}

                  {/* Bottom: stats (creator) or RSVP buttons (others) */}
                  <div
                    className="mt-auto pt-2.5 border-t border-border/40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isCreator ? (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-400">
                          <UsersIcon size={11} /> {ev.going} going
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          <UserXIcon size={11} /> {ev.not_going} not going
                        </span>
                        <span className="ml-auto text-muted-foreground/60">{ev.total_registered} registered</span>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => toggleRSVP(ev.id, ev.my_status, "going", e)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors
                            ${ev.my_status === "going"
                              ? "bg-green-500/20 border-green-500/40 text-green-400"
                              : "border-border/50 text-muted-foreground hover:border-green-500/40 hover:text-green-400"}`}
                        >
                          <CheckIcon size={11} /> Going
                        </button>
                        <button
                          onClick={(e) => toggleRSVP(ev.id, ev.my_status, "not_going", e)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors
                            ${ev.my_status === "not_going"
                              ? "bg-red-500/20 border-red-500/40 text-red-400"
                              : "border-border/50 text-muted-foreground hover:border-red-500/40 hover:text-red-400"}`}
                        >
                          <XIcon size={11} /> Not Going
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Event detail drawer ── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => { setSelectedEvent(null); setDrawerDetail(null); }}
          />
          <div className="w-full max-w-md bg-card border-l border-border h-full flex flex-col animate-in slide-in-from-right duration-200 shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold truncate flex-1 mr-3">{selectedEvent.title}</h2>
              <div className="flex items-center gap-1 shrink-0">
                {selectedEvent.created_by === user?.id && (
                  <button
                    onClick={() => deleteEvent(selectedEvent.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2Icon size={14} />
                  </button>
                )}
                <button
                  onClick={() => { setSelectedEvent(null); setDrawerDetail(null); }}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Emoji cover */}
              <div className={`h-24 rounded-xl flex items-center justify-center text-5xl ${getAccent(selectedEvent.event_date).bg}`}>
                {selectedEvent.cover_emoji}
              </div>

              {/* Event details */}
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <CalendarDaysIcon size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm">{fmtDateTime(selectedEvent.event_date)}</p>
                    {selectedEvent.end_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ends: {fmtDateTime(selectedEvent.end_date)}
                      </p>
                    )}
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2.5">
                    <MapPinIcon size={15} className="text-muted-foreground shrink-0" />
                    <p className="text-sm">{selectedEvent.location}</p>
                  </div>
                )}

                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedEvent.description}</p>
                )}
              </div>

              {selectedEvent.created_by === user?.id ? (
                /* ── CREATOR: attendee lists ── */
                drawerLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <LoaderIcon size={16} className="animate-spin mr-2" /> Loading attendees…
                  </div>
                ) : drawerDetail ? (
                  <div className="flex flex-col gap-5">
                    <AttendeeList registrations={drawerDetail.event_registrations ?? []} status="going" />
                    <AttendeeList registrations={drawerDetail.event_registrations ?? []} status="not_going" />
                  </div>
                ) : null
              ) : (
                /* ── NON-CREATOR: creator info + RSVP ── */
                <>
                  <div className="flex items-center gap-2.5 pt-1 border-t border-border/40">
                    <Avatar name={selectedEvent.creator_name} />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Created by</p>
                      <p className="text-sm font-medium">{selectedEvent.creator_name}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Non-creator RSVP footer */}
            {selectedEvent.created_by !== user?.id && (
              <div className="px-5 py-4 border-t border-border flex gap-2 shrink-0">
                <button
                  onClick={(e) => toggleRSVP(selectedEvent.id, selectedEvent.my_status, "going", e)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-lg border font-medium transition-colors
                    ${selectedEvent.my_status === "going"
                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                      : "border-border text-muted-foreground hover:border-green-500/40 hover:text-green-400"}`}
                >
                  <CheckIcon size={14} /> Going
                </button>
                <button
                  onClick={(e) => toggleRSVP(selectedEvent.id, selectedEvent.my_status, "not_going", e)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-lg border font-medium transition-colors
                    ${selectedEvent.my_status === "not_going"
                      ? "bg-red-500/20 border-red-500/40 text-red-400"
                      : "border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400"}`}
                >
                  <XIcon size={14} /> Not Going
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create event panel ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="w-full max-w-md bg-card border-l border-border h-full overflow-y-auto p-6 flex flex-col gap-5 animate-in slide-in-from-right duration-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">New Event</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={createEvent} className="flex flex-col gap-4">
              {/* Emoji */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Cover Emoji</label>
                <div className="flex flex-wrap gap-1">
                  {COVER_EMOJIS.map((em) => (
                    <button
                      key={em} type="button" onClick={() => setFEmoji(em)}
                      className={`h-9 w-9 rounded-lg text-xl flex items-center justify-center transition-colors
                        ${fEmoji === em ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted"}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title *</label>
                <input
                  value={fTitle} onChange={(e) => setFTitle(e.target.value)} required
                  placeholder="Event title…"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={3}
                  placeholder="What's this event about?"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <input
                  value={fLocation} onChange={(e) => setFLocation(e.target.value)}
                  placeholder="Conference room, Zoom link, etc."
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Start *</label>
                  <input
                    type="datetime-local" value={fDate}
                    onChange={(e) => setFDate(e.target.value)} required
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">End</label>
                  <input
                    type="datetime-local" value={fEndDate}
                    onChange={(e) => setFEndDate(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 text-foreground"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={saving}
                className="flex items-center justify-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium mt-2"
              >
                {saving ? <LoaderIcon size={14} className="animate-spin" /> : <CalendarDaysIcon size={14} />}
                {saving ? "Creating…" : "Create Event"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

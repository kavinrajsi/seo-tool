"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  MailIcon, SearchIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon,
  ChevronLeftIcon, ChevronRightIcon, SendIcon, InboxIcon,
} from "lucide-react";

const TYPE_COLORS = {
  invitation: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  alert: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const STATUS_COLORS = {
  sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

const AVATAR_COLORS = [
  "bg-purple-500", "bg-blue-500", "bg-green-500", "bg-amber-500",
  "bg-rose-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
];

function getAvatarColor(str) {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function getInitials(email) {
  const name = email.split("@")[0].replace(/[._-]/g, " ").trim();
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function formatTime(str) {
  const date = new Date(str);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateDay = new Date(date);
  dateDay.setHours(0, 0, 0, 0);
  if (dateDay.getTime() === today.getTime()) {
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatFullDate(str) {
  return new Date(str).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupByDate(logs) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {};
  for (const log of logs) {
    const d = new Date(log.sent_at);
    d.setHours(0, 0, 0, 0);
    let label;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
  }
  return groups;
}

const PAGE_SIZE = 50;

export default function EmailLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("email_logs")
      .select("*", { count: "exact" })
      .order("sent_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (search.trim()) query = query.or(`to.ilike.%${search}%,subject.ilike.%${search}%`);

    const { data, count } = await query;
    if (data) {
      setLogs(data);
      setSelected((prev) => prev ?? (data[0] || null));
    }
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [page, statusFilter, typeFilter, search]);

  useEffect(() => { setPage(0); }, [statusFilter, typeFilter, search]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const grouped = groupByDate(logs);

  const navItems = [
    { label: "All Mail", value: "all", icon: InboxIcon, count: total },
    { label: "Sent", value: "sent", icon: SendIcon, count: sentCount },
    { label: "Failed", value: "failed", icon: XCircleIcon, count: failedCount },
  ];

  return (
    <div className="flex flex-1 min-h-0 -mx-4 -mb-4 overflow-hidden">
      {/* ── Left sidebar ── */}
      <div className="w-52 border-r border-border bg-card flex flex-col shrink-0 p-2">
        <div className="flex items-center gap-2 px-3 py-3 mb-1">
          <MailIcon size={16} className="text-primary" />
          <span className="font-semibold text-sm">Email Log</span>
        </div>

        <p className="text-[10px] text-muted-foreground px-3 mb-1 font-medium uppercase tracking-wider">General</p>
        {navItems.map(({ label, value, icon: Icon, count }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors ${
              statusFilter === value
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Icon size={14} />
            <span className="flex-1">{label}</span>
            {count > 0 && <span className="text-[10px] text-muted-foreground">{count}</span>}
          </button>
        ))}

        <p className="text-[10px] text-muted-foreground px-3 mt-4 mb-1 font-medium uppercase tracking-wider">Folders</p>
        {[
          { label: "All Types", value: "all" },
          { label: "Invitation", value: "invitation" },
          { label: "Alert", value: "alert" },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors ${
              typeFilter === value
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0" />
            {label}
          </button>
        ))}

        <div className="mt-auto border-t border-border pt-2">
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 w-full transition-colors"
          >
            <RefreshCwIcon size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Email list ── */}
      <div className="w-[360px] border-r border-border flex flex-col shrink-0 bg-background">
        {/* List header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="font-semibold text-sm">
                {statusFilter === "all" ? "All Mail" : statusFilter === "sent" ? "Sent" : "Failed"}
              </h2>
              <p className="text-[11px] text-muted-foreground">{total} emails</p>
            </div>
          </div>
          <div className="relative">
            <SearchIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search anything..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/30 pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-10">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">No emails found.</div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-[10px] font-medium text-muted-foreground">{group}</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
                {items.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/20 ${
                      selected?.id === log.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0 ${getAvatarColor(log.to)}`}>
                      {getInitials(log.to)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate">{log.to.split("@")[0]}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(log.sent_at)}</span>
                      </div>
                      <p className="text-xs text-foreground/70 truncate mb-1">{log.subject}</p>
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[log.type] || "bg-muted/50 text-muted-foreground"}`}>
                          {log.type}
                        </span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[log.status]}`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon size={12} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Email detail ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {selected ? (
          <>
            {/* Detail header */}
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
              <h2 className="font-semibold text-base leading-snug">{selected.subject}</h2>
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{formatTime(selected.sent_at)}</span>
            </div>

            {/* Sender row */}
            <div className="px-6 py-3.5 border-b border-border flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${getAvatarColor(selected.to)}`}>
                {getInitials(selected.to)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{selected.to.split("@")[0]}</span>
                  <span className="text-xs text-muted-foreground">{selected.to}</span>
                </div>
                <p className="text-xs text-muted-foreground">To: {selected.to}</p>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="flex items-center gap-2 mb-6">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${TYPE_COLORS[selected.type] || "bg-muted/50 text-muted-foreground"}`}>
                  {selected.type}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[selected.status]}`}>
                  {selected.status === "sent" ? "✓ Delivered" : "✗ Failed"}
                </span>
              </div>

              <div className="space-y-2.5 text-sm mb-8">
                <div className="flex gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-14 shrink-0 pt-0.5">To</span>
                  <span className="text-foreground/80">{selected.to}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-14 shrink-0 pt-0.5">Type</span>
                  <span className="text-foreground/80 capitalize">{selected.type}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-14 shrink-0 pt-0.5">Sent at</span>
                  <span className="text-foreground/80">{formatFullDate(selected.sent_at)}</span>
                </div>
              </div>

              {selected.error ? (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-xs font-semibold text-red-400 mb-2">Error Details</p>
                  <p className="text-xs text-red-400/80 font-mono leading-relaxed">{selected.error}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <CheckCircleIcon size={36} className="text-emerald-400" />
                  <p className="text-sm">Email delivered successfully</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <MailIcon size={48} className="opacity-20" />
            <p className="text-sm">Select an email to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MailIcon, SearchIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const TYPE_COLORS = {
  invitation: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  alert: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const STATUS_COLORS = {
  sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PAGE_SIZE = 25;

function formatDate(str) {
  return new Date(str).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function EmailLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("email_logs")
      .select("*", { count: "exact" })
      .order("sent_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (search.trim()) query = query.or(`to.ilike.%${search}%,subject.ilike.%${search}%`);

    const { data, count } = await query;
    if (data) setLogs(data);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [page, typeFilter, statusFilter, search]);

  useEffect(() => { setPage(0); }, [typeFilter, statusFilter, search]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MailIcon size={24} className="text-primary" />
            Email Log
          </h1>
          <p className="text-muted-foreground mt-1">{total} emails recorded</p>
        </div>
        <button
          onClick={loadLogs}
          className="rounded-md border border-border p-2 hover:bg-muted/50 transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCwIcon size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MailIcon size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon size={14} className="text-emerald-400" />
            <span className="text-xs text-muted-foreground">Sent</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{sentCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircleIcon size={14} className="text-red-400" />
            <span className="text-xs text-muted-foreground">Failed</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{failedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none"
          >
            <option value="all">All Types</option>
            <option value="invitation">Invitation</option>
            <option value="alert">Alert</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_90px_80px_130px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
          <span>Recipient</span>
          <span>Subject</span>
          <span>Type</span>
          <span>Status</span>
          <span>Sent At</span>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-10">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">No emails found.</div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id}>
              <div
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className={`grid grid-cols-[1fr_1.5fr_90px_80px_130px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer ${
                  i < logs.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <span className="text-sm truncate">{log.to}</span>
                <span className="text-sm truncate text-muted-foreground">{log.subject}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${TYPE_COLORS[log.type] || "bg-muted/50 text-muted-foreground"}`}>
                  {log.type}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[log.status]}`}>
                  {log.status}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(log.sent_at)}</span>
              </div>
              {expandedId === log.id && log.error && (
                <div className="px-4 py-3 bg-red-500/5 border-b border-border/50">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Error</p>
                  <p className="text-xs text-red-400 font-mono">{log.error}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

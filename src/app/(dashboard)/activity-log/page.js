"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import {
  ScrollTextIcon, SearchIcon, RefreshCwIcon, ChevronLeftIcon,
  ChevronRightIcon, LoaderIcon, ChevronDownIcon,
  PlusIcon, PencilIcon, Trash2Icon, LogInIcon, LogOutIcon, KeyIcon, UserPlusIcon,
} from "lucide-react";

const ACTION_COLORS = {
  INSERT: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  UPDATE: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-400 border border-red-500/20",
  SIGN_IN: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  SIGN_IN_GOOGLE: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  SIGN_UP: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  SIGN_OUT: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  PASSWORD_RESET_REQUEST: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  PASSWORD_RESET: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  AUTH_CALLBACK: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};

const ACTION_ICONS = {
  INSERT: PlusIcon,
  UPDATE: PencilIcon,
  DELETE: Trash2Icon,
  SIGN_IN: LogInIcon,
  SIGN_IN_GOOGLE: LogInIcon,
  SIGN_UP: UserPlusIcon,
  SIGN_OUT: LogOutIcon,
  PASSWORD_RESET_REQUEST: KeyIcon,
  PASSWORD_RESET: KeyIcon,
  AUTH_CALLBACK: LogInIcon,
};

const ACTION_LABELS = {
  INSERT: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  SIGN_IN: "Sign In",
  SIGN_IN_GOOGLE: "Google Sign In",
  SIGN_UP: "Sign Up",
  SIGN_OUT: "Sign Out",
  PASSWORD_RESET_REQUEST: "Password Reset Request",
  PASSWORD_RESET: "Password Reset",
  AUTH_CALLBACK: "Auth Callback",
};

const PAGE_SIZE = 25;

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTable, setFilterTable] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [tables, setTables] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    supabase
      .from("activity_logs")
      .select("table_name")
      .not("table_name", "is", null)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((r) => r.table_name))].sort();
          setTables(unique);
        }
      });
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(
        `user_email.ilike.%${search.trim()}%,table_name.ilike.%${search.trim()}%,record_id.ilike.%${search.trim()}%`
      );
    }
    if (filterAction !== "all") query = query.eq("action", filterAction);
    if (filterTable !== "all") query = query.eq("table_name", filterTable);

    const { data, count } = await query;
    setLogs(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, filterAction, filterTable]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function formatDate(str) {
    const d = new Date(str);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function formatTableName(name) {
    if (!name) return "—";
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ScrollTextIcon size={24} className="text-primary" />
            Activity Log
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All system activity — {total.toLocaleString()} events
          </p>
        </div>
        <button
          onClick={() => { setPage(0); fetchLogs(); }}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCwIcon size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by email, table, or record ID..."
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        >
          <option value="all">All actions</option>
          <option value="INSERT">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
          <option value="SIGN_IN">Sign In</option>
          <option value="SIGN_IN_GOOGLE">Google Sign In</option>
          <option value="SIGN_UP">Sign Up</option>
          <option value="SIGN_OUT">Sign Out</option>
          <option value="PASSWORD_RESET_REQUEST">Password Reset Request</option>
          <option value="PASSWORD_RESET">Password Reset</option>
        </select>
        <select
          value={filterTable}
          onChange={(e) => { setFilterTable(e.target.value); setPage(0); }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        >
          <option value="all">All tables</option>
          {tables.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoaderIcon size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ScrollTextIcon size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No activity found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-8 px-2"></th>
                <th className="text-left px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">User</th>
                <th className="text-center px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium w-36">Action</th>
                <th className="text-left px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Table</th>
                <th className="text-left px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium w-28">Record</th>
                <th className="text-right px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium w-44">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const Icon = ACTION_ICONS[log.action] || PencilIcon;
                const isExpanded = expandedId === log.id;
                const hasData = log.old_data || log.new_data || (log.metadata && Object.keys(log.metadata).length > 0);

                return (
                  <Fragment key={log.id}>
                    <tr
                      className={`${i < logs.length - 1 && !isExpanded ? "border-b border-border/50" : ""} hover:bg-muted/20 transition-colors ${hasData ? "cursor-pointer" : ""}`}
                      onClick={() => hasData && setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td className="px-2 text-center text-muted-foreground">
                        {hasData && (isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />)}
                      </td>
                      <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                        {log.user_email || <span className="text-muted-foreground italic">system</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium ${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"}`}>
                          <Icon size={10} />
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {log.table_name ? (
                          <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">{log.table_name}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono truncate max-w-[120px]" title={log.record_id}>
                        {log.record_id ? log.record_id.slice(0, 8) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(log.created_at)}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border/50">
                        <td colSpan={6} className="px-6 py-4 bg-muted/10">
                          <DataDiff oldData={log.old_data} newData={log.new_data} metadata={log.metadata} action={log.action} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function DataDiff({ oldData, newData, metadata, action }) {
  if (action === "UPDATE" && oldData && newData) {
    const allKeys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])].sort();
    const changedKeys = allKeys.filter((k) => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]));

    if (changedKeys.length === 0) {
      return <p className="text-xs text-muted-foreground italic">No visible changes</p>;
    }

    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Changes</p>
        <div className="grid gap-1.5">
          {changedKeys.map((key) => (
            <div key={key} className="flex items-start gap-3 text-xs">
              <span className="font-mono font-medium text-foreground min-w-[140px] shrink-0">{key}</span>
              <span className="text-red-400 line-through break-all">{formatValue(oldData[key])}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-emerald-400 break-all">{formatValue(newData[key])}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (action === "INSERT" && newData) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">New Record</p>
        <div className="grid gap-1 max-h-[300px] overflow-y-auto">
          {Object.entries(newData).map(([key, val]) => (
            <div key={key} className="flex items-start gap-3 text-xs">
              <span className="font-mono font-medium text-foreground min-w-[140px] shrink-0">{key}</span>
              <span className="text-muted-foreground break-all">{formatValue(val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (action === "DELETE" && oldData) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Deleted Record</p>
        <div className="grid gap-1 max-h-[300px] overflow-y-auto">
          {Object.entries(oldData).map(([key, val]) => (
            <div key={key} className="flex items-start gap-3 text-xs">
              <span className="font-mono font-medium text-foreground min-w-[140px] shrink-0">{key}</span>
              <span className="text-red-400/70 break-all">{formatValue(val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (metadata && Object.keys(metadata).length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Details</p>
        <div className="grid gap-1">
          {Object.entries(metadata).map(([key, val]) => (
            <div key={key} className="flex items-start gap-3 text-xs">
              <span className="font-mono font-medium text-foreground min-w-[140px] shrink-0">{key}</span>
              <span className="text-muted-foreground break-all">{formatValue(val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p className="text-xs text-muted-foreground italic">No additional data</p>;
}

function formatValue(val) {
  if (val === null || val === undefined) return "null";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

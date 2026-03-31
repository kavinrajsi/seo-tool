"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  getFileType, getFileName, getDirPath, TYPE_CONFIG, TYPE_EXTS,
} from "@/lib/hard-disk-types";
import {
  HardDriveIcon, FileTextIcon, ImageIcon, VideoIcon, MusicIcon,
  ArchiveIcon, TypeIcon as FontIcon, FolderIcon, FileIcon, SearchIcon,
  ChevronLeftIcon, ChevronRightIcon, LoaderIcon,
} from "lucide-react";

// ─── helpers ───────────────────────────────────────────────────────────────

function FileEntryIcon({ type, size = 15 }) {
  const cls = `shrink-0 ${TYPE_CONFIG[type]?.color.replace("bg-", "text-") ?? "text-zinc-400"}`;
  const props = { size, className: cls };
  switch (type) {
    case "document": return <FileTextIcon {...props} />;
    case "image":    return <ImageIcon    {...props} />;
    case "video":    return <VideoIcon    {...props} />;
    case "audio":    return <MusicIcon    {...props} />;
    case "archive":  return <ArchiveIcon  {...props} />;
    case "font":     return <FontIcon     {...props} />;
    case "folder":   return <FolderIcon   {...props} />;
    default:         return <FileIcon     {...props} />;
  }
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

const ALL_TYPES = ["all", "document", "image", "video", "audio", "archive", "font", "other"];

// ─── component ─────────────────────────────────────────────────────────────

export default function FileManagerPage() {
  const [stats,    setStats]    = useState(null);
  const [files,    setFiles]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [type,     setType]     = useState("all");
  const [drive,    setDrive]    = useState("");
  const [q,        setQ]        = useState("");
  const debounceRef = useRef(null);

  const LIMIT = 50;

  // fetch stats once
  useEffect(() => {
    getAuthHeader().then((headers) =>
      fetch("/api/hard-disk/stats", { headers })
        .then((r) => r.json())
        .then((d) => setStats(d))
    );
  }, []);

  const fetchFiles = useCallback(async (pg, t, dr, query) => {
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (t && t !== "all") params.set("type", t);
      if (dr) params.set("drive", dr);
      if (query) params.set("q", query);
      const res  = await fetch(`/api/hard-disk/browse?${params}`, { headers });
      const json = await res.json();
      setFiles(json.files ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(page, type, drive, q); }, [page, type, drive]);

  function handleSearch(val) {
    setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); fetchFiles(1, type, drive, val); }, 350);
  }

  function changeType(t) { setType(t); setPage(1); }
  function changeDrive(d) { setDrive(d); setPage(1); }

  // ── type breakdown bar ──────────────────────────────────────────────────
  const sampleTotal = stats ? Object.values(stats.by_type).reduce((a, b) => a + b, 0) : 0;
  const barTypes = ["document", "image", "video", "audio", "archive", "font", "other"];

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 max-w-6xl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <HardDriveIcon size={24} className="text-blue-400" />
          File Manager
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {stats ? `${stats.total.toLocaleString()} files indexed across ${stats.uploads?.length ?? 0} drives` : "Loading…"}
        </p>
      </div>

      {/* ── Recently indexed ── */}
      {stats?.recent?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recently indexed</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.recent.map((f) => {
              const ft = getFileType(f.path);
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <FileEntryIcon type={ft} size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{getFileName(f.path)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TYPE_CONFIG[ft]?.label ?? "Other"} · {f.hard_disk_uploads?.name ?? "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── All files panel ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">All files</h2>
          <div className="flex items-center gap-2">
            {/* search */}
            <div className="relative">
              <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={q}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search paths…"
                className="h-8 rounded-lg border border-border bg-background pl-7 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 w-44 placeholder:text-muted-foreground"
              />
            </div>
            {/* drive filter */}
            {stats?.uploads?.length > 1 && (
              <select
                value={drive}
                onChange={(e) => changeDrive(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/40 text-foreground"
              >
                <option value="">All drives</option>
                {stats.uploads.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* type breakdown bar */}
        {sampleTotal > 0 && (
          <div className="px-5 pt-4 pb-3 border-b border-border">
            <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
              {barTypes.map((t) => {
                const pct = sampleTotal > 0 ? ((stats.by_type[t] ?? 0) / sampleTotal) * 100 : 0;
                if (pct < 0.5) return null;
                return (
                  <button
                    key={t}
                    onClick={() => changeType(type === t ? "all" : t)}
                    title={TYPE_CONFIG[t]?.label}
                    style={{ width: `${pct}%` }}
                    className={`h-full transition-opacity ${TYPE_CONFIG[t]?.color} ${type !== "all" && type !== t ? "opacity-30" : "opacity-100"} hover:opacity-80`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {barTypes.map((t) => {
                const count = stats.by_type[t] ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    key={t}
                    onClick={() => changeType(type === t ? "all" : t)}
                    className={`flex items-center gap-1.5 text-xs transition-opacity ${type !== "all" && type !== t ? "opacity-40" : ""}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-sm ${TYPE_CONFIG[t]?.color}`} />
                    <span className="text-muted-foreground">{TYPE_CONFIG[t]?.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* type tab pills */}
        <div className="flex gap-1 px-5 py-3 border-b border-border overflow-x-auto">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => changeType(t)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                type === t
                  ? "bg-blue-600 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t === "all" ? "All" : TYPE_CONFIG[t]?.label ?? t}
            </button>
          ))}
        </div>

        {/* table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <LoaderIcon size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : files.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No files found{q ? ` matching "${q}"` : ""}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium w-1/2">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Drive</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Indexed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((f) => {
                  const ft = getFileType(f.path);
                  const fname = getFileName(f.path);
                  const dir   = getDirPath(f.path);
                  return (
                    <tr key={f.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <FileEntryIcon type={ft} size={14} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-xs">{fname}</p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-xs font-mono">{dir}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {f.hard_disk_uploads?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                          ft === "document" ? "bg-blue-500/10 border-blue-500/20 text-blue-400"  :
                          ft === "image"    ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                          ft === "video"    ? "bg-violet-500/10 border-violet-500/20 text-violet-400" :
                          ft === "audio"    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"    :
                          ft === "archive"  ? "bg-red-500/10 border-red-500/20 text-red-400"          :
                          ft === "font"     ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          ft === "folder"   ? "bg-slate-500/10 border-slate-500/20 text-slate-400"    :
                                             "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                        }`}>
                          {TYPE_CONFIG[ft]?.label ?? "Other"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {f.hard_disk_uploads?.created_at
                          ? new Date(f.hard_disk_uploads.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {((page - 1) * LIMIT + 1).toLocaleString()}–{Math.min(page * LIMIT, total).toLocaleString()} of ~{total.toLocaleString()} files
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon size={13} />
              </button>
              <span className="px-2 text-xs text-muted-foreground tabular-nums">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

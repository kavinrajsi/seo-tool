"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  HardDriveIcon,
  SearchIcon,
  UploadIcon,
  Trash2Icon,
  FileTextIcon,
  FolderIcon,
  LoaderIcon,
  XIcon,
  CheckIcon,
} from "lucide-react";

function getIcon(path) {
  if (path.endsWith("/") || !path.includes(".")) return <FolderIcon size={13} className="text-blue-400 shrink-0 mt-0.5" />;
  return <FileTextIcon size={13} className="text-zinc-400 shrink-0 mt-0.5" />;
}

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function HardDiskPage() {
  const [user, setUser] = useState(null);
  const [isPrivileged, setIsPrivileged] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);

  // Upload state
  const [uploads, setUploads] = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null); // { type: "success"|"error", text }
  const [uploadProgress, setUploadProgress] = useState(null); // { current, total }
  const fileInputRef = useRef(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: me } = await supabase
        .from("employees")
        .select("role")
        .eq("work_email", user.email)
        .maybeSingle();

      if (me && (me.role === "admin" || me.role === "owner")) {
        setIsPrivileged(true);
        loadUploads();
      }
    }
    init();
  }, []);

  async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setTotal(0); return; }
    setSearching(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/hard-disk/search?q=${encodeURIComponent(q)}&limit=100`, { headers });
      const json = await res.json();
      setResults(json.results ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  async function loadUploads() {
    setUploadsLoading(true);
    const headers = await getAuthHeader();
    const res = await fetch("/api/hard-disk/uploads", { headers });
    const json = await res.json();
    setUploads(json.uploads ?? []);
    setUploadsLoading(false);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    setUploadMsg(null);
    setUploadProgress(null);
    try {
      // Read entire file client-side to avoid Vercel's 4.5MB body limit
      const text = await uploadFile.text();
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length === 0) throw new Error("File is empty");

      const CHUNK = 2000;
      const authHeaders = { ...(await getAuthHeader()), "Content-Type": "application/json" };
      let uploadId = null;

      for (let i = 0; i < lines.length; i += CHUNK) {
        const chunk = lines.slice(i, i + CHUNK);
        const isLast = i + CHUNK >= lines.length;

        const body = {
          lines: chunk,
          finalize: isLast,
          ...(uploadId ? { uploadId } : { name: uploadName.trim(), file_name: uploadFile.name }),
        };

        const res = await fetch("/api/hard-disk/upload", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        uploadId = json.uploadId;
        setUploadProgress({ current: Math.min(i + CHUNK, lines.length), total: lines.length });
      }

      setUploadMsg({ type: "success", text: `Uploaded "${uploadName.trim()}" — ${lines.length.toLocaleString()} paths indexed.` });
      setUploadName("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadUploads();
    } catch (err) {
      setUploadMsg({ type: "error", text: err.message });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete upload "${name}" and all its paths?`)) return;
    const headers = await getAuthHeader();
    await fetch("/api/hard-disk/uploads", {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setUploads((prev) => prev.filter((u) => u.id !== id));
    // Clear results if they came from this upload
    setResults((prev) => prev.filter((r) => r.upload_id !== id));
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <HardDriveIcon size={24} className="text-blue-400" />
            Hard Disk
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Search file paths across all indexed drives</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search file paths…  e.g.  .ai  or  15th Draft  or  Fonts"
          className="w-full rounded-xl border border-border bg-card pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 placeholder:text-muted-foreground"
        />
        {searching && (
          <LoaderIcon size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
        {query && !searching && (
          <button
            onClick={() => { setQuery(""); setResults([]); setTotal(0); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <XIcon size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {query && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {searching ? "Searching…" : `${results.length} results${total > results.length ? ` (showing ${results.length} of ~${total.toLocaleString()})` : ""}`}
            </span>
            {results.length > 0 && (
              <span className="text-xs text-muted-foreground">query: <code className="font-mono text-blue-400">{query}</code></span>
            )}
          </div>

          {results.length === 0 && !searching ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No paths found matching <span className="font-mono text-foreground">"{query}"</span>
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {results.map((r) => (
                <li key={r.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/20 transition-colors group">
                  {getIcon(r.path)}
                  <span className="font-mono text-xs text-foreground break-all leading-relaxed flex-1">
                    {highlight(r.path, query)}
                  </span>
                  {r.hard_disk_uploads?.name && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 self-center">
                      {r.hard_disk_uploads.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Upload section — admin/owner only */}
      {isPrivileged && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-medium flex items-center gap-2">
            <UploadIcon size={16} className="text-muted-foreground" />
            Upload Index File
          </h2>

          <form onSubmit={handleUpload} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Drive / Label name</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Design HDD – 2024"
                required
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Text file (.txt)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,text/plain"
                required
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/10 file:text-blue-400 file:px-3 file:py-1.5 file:text-xs file:font-medium file:cursor-pointer hover:file:bg-blue-500/20 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">One file path per line. Each line will be individually searchable.</p>
            </div>

            {uploadMsg && (
              <div className={`flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg border ${uploadMsg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                {uploadMsg.type === "success" ? <CheckIcon size={13} className="shrink-0 mt-0.5" /> : <XIcon size={13} className="shrink-0 mt-0.5" />}
                {uploadMsg.text}
              </div>
            )}

            {uploadProgress && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Indexing… {uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()} paths</span>
                  <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !uploadFile || !uploadName.trim()}
              className="self-start flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              {uploading ? <LoaderIcon size={13} className="animate-spin" /> : <UploadIcon size={13} />}
              {uploading ? "Indexing…" : "Upload & Index"}
            </button>
          </form>

          {/* Existing uploads */}
          <h2 className="text-base font-medium flex items-center gap-2 mt-2">
            <HardDriveIcon size={16} className="text-muted-foreground" />
            Indexed Drives
          </h2>

          {uploadsLoading ? (
            <div className="text-sm text-muted-foreground py-4">Loading…</div>
          ) : uploads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No drives indexed yet. Upload a .txt file above.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Name</th>
                    <th className="px-4 py-2.5 text-left font-medium">File</th>
                    <th className="px-4 py-2.5 text-right font-medium">Paths</th>
                    <th className="px-4 py-2.5 text-left font-medium">Uploaded by</th>
                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {uploads.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.file_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-blue-400 font-medium">{u.line_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.uploaded_by}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="text-muted-foreground hover:text-red-400 transition-colors p-1 rounded"
                        >
                          <Trash2Icon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

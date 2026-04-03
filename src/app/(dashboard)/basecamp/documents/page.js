"use client";

import { useState, useEffect } from "react";
import {
  FileTextIcon,
  UploadIcon,
  FolderIcon,
  ExternalLinkIcon,
  SearchIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";

export default function BasecampDocuments() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch("/api/basecamp/events?filter=documents&limit=500");
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch {}
    setLoading(false);
  }

  const filtered = events.filter((e) => {
    if (search) {
      const s = search.toLowerCase();
      if (!e.recording_title?.toLowerCase().includes(s) && !e.project_name?.toLowerCase().includes(s)) return false;
    }
    if (typeFilter === "documents" && !e.event_kind?.includes("document")) return false;
    if (typeFilter === "files" && !e.event_kind?.includes("upload")) return false;
    return true;
  });

  const docCount = events.filter((e) => e.event_kind?.includes("document")).length;
  const fileCount = events.filter((e) => e.event_kind?.includes("upload")).length;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileTextIcon size={24} className="text-amber-400" />
            Documents & Files
          </h1>
          <p className="text-muted-foreground mt-1">{events.length} document events from Basecamp</p>
        </div>
        <button onClick={loadEvents} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors">
          <RefreshCwIcon size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{events.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{docCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Documents</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{fileCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Files</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { value: "all", label: "All" },
            { value: "documents", label: "Documents" },
            { value: "files", label: "Files" },
          ].map((f) => (
            <button key={f.value} onClick={() => setTypeFilter(f.value)} className={`px-4 py-2 text-xs font-medium transition-colors ${typeFilter === f.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <FileTextIcon size={28} />
          <p className="text-sm">{events.length === 0 ? "No document events yet." : "No matching documents."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((event, i) => {
            const isUpload = event.event_kind?.includes("upload");
            const Icon = isUpload ? UploadIcon : FileTextIcon;
            return (
              <div key={event.id} onClick={() => setSelectedEvent(event)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
                <Icon size={16} className={isUpload ? "text-blue-400" : "text-amber-400"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.recording_title || "Untitled"}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isUpload ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>{isUpload ? "File" : "Doc"}</span>
                    {event.project_name && <span className="flex items-center gap-1"><FolderIcon size={10} /> {event.project_name}</span>}
                    {event.creator_name && <span>by {event.creator_name}</span>}
                    <span>{new Date(event.received_at).toLocaleString()}</span>
                  </div>
                </div>
                {event.app_url && (
                  <a href={event.app_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
                    View <ExternalLinkIcon size={10} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedEvent && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedEvent(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold truncate">{selectedEvent.recording_title || "Detail"}</h2>
              <button onClick={() => setSelectedEvent(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Type</p><p className="text-sm font-medium">{selectedEvent.recording_type || "—"}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Project</p><p className="text-sm font-medium truncate">{selectedEvent.project_name || "—"}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">By</p><p className="text-sm font-medium truncate">{selectedEvent.creator_name || "—"}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Received</p><p className="text-sm font-medium">{new Date(selectedEvent.received_at).toLocaleString()}</p></div>
              </div>
              {selectedEvent.app_url && (
                <a href={selectedEvent.app_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">Open in Basecamp <ExternalLinkIcon size={14} /></a>
              )}
              <details><summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Raw payload</summary>
                <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-4 border border-border">{JSON.stringify(selectedEvent.raw_payload, null, 2)}</pre>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

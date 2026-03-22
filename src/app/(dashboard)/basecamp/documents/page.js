"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  FileTextIcon,
  FileIcon,
  ImageIcon,
  FileVideoIcon,
  FileArchiveIcon,
  ExternalLinkIcon,
  SearchIcon,
  AlertTriangleIcon,
  FolderIcon,
  FolderOpenIcon,
  XIcon,
  DownloadIcon,
  HardDriveIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  LayersIcon,
} from "lucide-react";

function fmtSize(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + " KB";
  return bytes + " B";
}

function getFileIcon(contentType, docType) {
  if (docType === "document") return FileTextIcon;
  if (!contentType) return FileIcon;
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType.startsWith("video/")) return FileVideoIcon;
  if (contentType.includes("zip") || contentType.includes("archive") || contentType.includes("compressed")) return FileArchiveIcon;
  if (contentType.includes("pdf")) return FileTextIcon;
  return FileIcon;
}

function FileRow({ doc, onSelect }) {
  const Icon = getFileIcon(doc.content_type, doc.doc_type);
  return (
    <div
      onClick={() => onSelect(doc)}
      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
    >
      <Icon size={16} className="text-muted-foreground shrink-0" />
      <span className="text-sm truncate flex-1">{doc.title || doc.filename}</span>
      {doc.byte_size > 0 && (
        <span className="text-[10px] text-muted-foreground shrink-0">{fmtSize(doc.byte_size)}</span>
      )}
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${doc.doc_type === "file" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>
        {doc.doc_type === "file" ? "File" : "Doc"}
      </span>
      {doc.app_url && (
        <a href={doc.app_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary shrink-0">
          <ExternalLinkIcon size={12} />
        </a>
      )}
    </div>
  );
}

function FolderSection({ name, items, onSelect }) {
  const [open, setOpen] = useState(true);
  const totalSize = items.reduce((s, d) => s + (d.byte_size || 0), 0);

  return (
    <div className="ml-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 w-full text-left transition-colors">
        {open ? <ChevronDownIcon size={14} className="text-muted-foreground" /> : <ChevronRightIcon size={14} className="text-muted-foreground" />}
        {open ? <FolderOpenIcon size={16} className="text-amber-400" /> : <FolderIcon size={16} className="text-amber-400" />}
        <span className="text-sm font-medium flex-1">{name}</span>
        <span className="text-[10px] text-muted-foreground">{items.length} items</span>
        {totalSize > 0 && <span className="text-[10px] text-muted-foreground">{fmtSize(totalSize)}</span>}
      </button>
      {open && (
        <div className="ml-4 border-l border-border/30 pl-2 mt-1 space-y-0.5">
          {items.map((doc) => <FileRow key={doc.id} doc={doc} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

function ProjectSection({ projectName, items, onSelect }) {
  const [open, setOpen] = useState(true);

  // Group by folder
  const rootItems = items.filter((d) => !d.folder_name);
  const folders = {};
  for (const d of items) {
    if (d.folder_name) {
      if (!folders[d.folder_name]) folders[d.folder_name] = [];
      folders[d.folder_name].push(d);
    }
  }
  const folderNames = Object.keys(folders).sort();
  const totalSize = items.reduce((s, d) => s + (d.byte_size || 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/20 transition-colors">
        {open ? <ChevronDownIcon size={16} className="text-muted-foreground" /> : <ChevronRightIcon size={16} className="text-muted-foreground" />}
        <LayersIcon size={18} className="text-emerald-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{projectName}</p>
          <p className="text-[10px] text-muted-foreground">{items.length} items · {fmtSize(totalSize) || "0 B"}</p>
        </div>
      </button>
      {open && (
        <div className="px-2 pb-3 space-y-1">
          {/* Folders */}
          {folderNames.map((name) => (
            <FolderSection key={name} name={name} items={folders[name]} onSelect={onSelect} />
          ))}
          {/* Root-level files (no folder) */}
          {rootItems.length > 0 && (
            <div className="ml-4 space-y-0.5">
              {folderNames.length > 0 && <p className="text-[10px] text-muted-foreground px-2 py-1 uppercase tracking-wider">Root</p>}
              {rootItems.map((doc) => <FileRow key={doc.id} doc={doc} onSelect={onSelect} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BasecampDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokenRows } = await supabase
        .from("basecamp_tokens")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!tokenRows?.length) { setLoading(false); return; }
      setConnected(true);

      const { data: stored } = await supabase
        .from("basecamp_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("project_name", { ascending: true })
        .order("folder_name", { ascending: true })
        .order("title", { ascending: true });

      if (stored) setDocuments(stored);
      setLoading(false);
    })();
  }, []);

  const filtered = documents.filter((d) => {
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase()) && !d.filename?.toLowerCase().includes(search.toLowerCase()) && !d.project_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter === "document" && d.doc_type !== "document") return false;
    if (typeFilter === "file" && d.doc_type !== "file") return false;
    return true;
  });

  // Group by project
  const projectGroups = {};
  for (const d of filtered) {
    const key = d.project_name || "Unknown";
    if (!projectGroups[key]) projectGroups[key] = [];
    projectGroups[key].push(d);
  }
  const projectNames = Object.keys(projectGroups).sort();

  const docCount = documents.filter((d) => d.doc_type === "document").length;
  const fileCount = documents.filter((d) => d.doc_type === "file").length;
  const totalSize = documents.reduce((s, d) => s + (d.byte_size || 0), 0);
  const folderCount = [...new Set(documents.filter((d) => d.folder_name).map((d) => `${d.project_id}-${d.folder_name}`))].length;

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <FileTextIcon size={40} className="text-emerald-400" />
        <h2 className="text-lg font-bold">Connect Basecamp</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">Connect your Basecamp account in Settings to view documents and files.</p>
        <a href="/settings" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors">Go to Settings</a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileTextIcon size={24} className="text-emerald-400" />
          Documents & Files
        </h1>
        <p className="text-muted-foreground mt-1">{documents.length} items across {projectNames.length} projects</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangleIcon size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{docCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Documents</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{fileCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Files</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{folderCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Folders</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{fmtSize(totalSize) || "0 B"}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Size</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{projectNames.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Projects</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, filename, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { value: "all", label: "All" },
            { value: "document", label: "Docs" },
            { value: "file", label: "Files" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${typeFilter === f.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tree View */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <FileTextIcon size={28} />
          <p className="text-sm">{documents.length === 0 ? "No documents yet. Sync from Settings." : "No matching items."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projectNames.map((name) => (
            <ProjectSection key={name} projectName={name} items={projectGroups[name]} onSelect={setSelectedDoc} />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selectedDoc && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedDoc(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold truncate">{selectedDoc.title || selectedDoc.filename}</h2>
              <button onClick={() => setSelectedDoc(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent">
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium">{selectedDoc.doc_type === "file" ? "File" : "Document"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Size</p>
                  <p className="text-sm font-medium">{selectedDoc.byte_size > 0 ? fmtSize(selectedDoc.byte_size) : "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Project</p>
                  <p className="text-sm font-medium truncate">{selectedDoc.project_name}</p>
                </div>
                {selectedDoc.folder_name && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Folder</p>
                    <p className="text-sm font-medium truncate">{selectedDoc.folder_name}</p>
                  </div>
                )}
                {selectedDoc.content_type && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Content Type</p>
                    <p className="text-sm font-medium truncate">{selectedDoc.content_type}</p>
                  </div>
                )}
                {selectedDoc.filename && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Filename</p>
                    <p className="text-sm font-medium truncate">{selectedDoc.filename}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {selectedDoc.app_url && (
                  <a href={selectedDoc.app_url} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                    Open in Basecamp <ExternalLinkIcon size={14} />
                  </a>
                )}
                {selectedDoc.download_url && (
                  <a href={selectedDoc.download_url} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm hover:bg-primary/90 transition-colors">
                    Download <DownloadIcon size={14} />
                  </a>
                )}
              </div>
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Raw data</summary>
                <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-4 border border-border">
                  {JSON.stringify(selectedDoc, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

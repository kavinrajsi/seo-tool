"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import {
  FileTextIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  SearchIcon,
  AlertTriangleIcon,
  LayoutGridIcon,
  ListIcon,
  FolderIcon,
  XIcon,
} from "lucide-react";

export default function BasecampDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
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

      if (!tokenRows?.length) {
        setLoading(false);
        return;
      }

      setConnected(true);

      const { data: stored } = await supabase
        .from("basecamp_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at_basecamp", { ascending: false });

      if (stored) setDocuments(stored);
      setLoading(false);
    })();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      const res = await apiFetch("/api/basecamp/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    }
    setSyncing(false);
  }

  const filtered = documents.filter((d) => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.project_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const projectCount = [...new Set(documents.map((d) => d.project_id))].length;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <FileTextIcon size={40} className="text-emerald-400" />
        <h2 className="text-lg font-bold">Connect Basecamp</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Connect your Basecamp account in Settings to view documents.
        </p>
        <a href="/settings" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors">
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileTextIcon size={24} className="text-emerald-400" />
            Documents
          </h1>
          <p className="text-muted-foreground mt-1">{documents.length} documents across {projectCount} projects</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangleIcon size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{documents.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Documents</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{projectCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Projects</p>
        </div>
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-2 transition-colors ${view === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGridIcon size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 transition-colors ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {/* Documents */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <FileTextIcon size={28} />
          <p className="text-sm">{documents.length === 0 ? "No documents yet. Click sync to fetch from Basecamp." : "No matching documents."}</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <div key={doc.id} onClick={() => setSelectedDoc(doc)} className="rounded-xl border border-border bg-card p-5 flex flex-col cursor-pointer hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <span className="flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  <FolderIcon size={10} /> {doc.project_name}
                </span>
                {doc.app_url && (
                  <a
                    href={doc.app_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Open <ExternalLinkIcon size={10} />
                  </a>
                )}
              </div>
              <h3 className="text-sm font-semibold mb-1">{doc.title}</h3>
              <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Created {doc.created_at_basecamp ? new Date(doc.created_at_basecamp).toLocaleDateString() : "—"}</span>
                <span>Updated {doc.updated_at_basecamp ? new Date(doc.updated_at_basecamp).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((doc, i) => (
            <div key={doc.id} onClick={() => setSelectedDoc(doc)} className={`flex items-center gap-4 px-4 py-3 cursor-pointer ${i < filtered.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/20 transition-colors`}>
              <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <FileTextIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                    <FolderIcon size={10} /> {doc.project_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {doc.updated_at_basecamp ? new Date(doc.updated_at_basecamp).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
              {doc.app_url && (
                <a
                  href={doc.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                  View <ExternalLinkIcon size={10} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Raw data drawer */}
      {selectedDoc && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedDoc(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold truncate">{selectedDoc.title}</h2>
              <button onClick={() => setSelectedDoc(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent">
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-4 border border-border">
                {JSON.stringify(selectedDoc, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

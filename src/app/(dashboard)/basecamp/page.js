"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import {
  LayersIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  SearchIcon,
  CheckCircleIcon,
  ArchiveIcon,
  AlertTriangleIcon,
} from "lucide-react";

export default function BasecampProjects() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);

      // Check connection
      const { data: tokenRows } = await supabase
        .from("basecamp_tokens")
        .select("account_name")
        .eq("user_id", u.id)
        .limit(1);

      if (tokenRows?.length > 0) {
        setConnected(true);
        setAccountName(tokenRows[0].account_name || "");

        // Load stored projects
        const { data: stored } = await supabase
          .from("basecamp_projects")
          .select("*")
          .eq("user_id", u.id)
          .order("name", { ascending: true });

        if (stored) setProjects(stored);
      }

      setLoading(false);
    })();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      const res = await apiFetch("/api/basecamp/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProjects(data.projects);
    } catch (err) {
      setError(err.message);
    }
    setSyncing(false);
  }

  const filtered = projects.filter((p) => {
    if (filter === "active" && p.status !== "active") return false;
    if (filter === "archived" && p.status !== "archived") return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = projects.filter((p) => p.status === "active").length;
  const archivedCount = projects.filter((p) => p.status !== "active").length;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <LayersIcon size={40} className="text-emerald-400" />
        <h2 className="text-lg font-bold">Connect Basecamp</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Connect your Basecamp account in Settings to view and sync your projects.
        </p>
        <a
          href="/settings"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
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
            <LayersIcon size={24} className="text-emerald-400" />
            Basecamp Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            {accountName ? `${accountName} · ` : ""}{projects.length} projects
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white flex items-center gap-2 transition-colors"
        >
          <RefreshCwIcon size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync Projects"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangleIcon size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{projects.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Active</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-zinc-400">{archivedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Archived</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Project Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <LayersIcon size={28} />
          <p className="text-sm">{search ? "No matching projects." : "No projects found."}</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <div key={project.id} className="rounded-xl border border-border bg-card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${project.status === "active" ? "bg-emerald-400" : "bg-zinc-400"}`} />
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    project.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"
                  }`}>
                    {project.status === "active" ? "Active" : "Archived"}
                  </span>
                </div>
                {project.app_url && (
                  <a
                    href={project.app_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Open <ExternalLinkIcon size={10} />
                  </a>
                )}
              </div>

              <h3 className="text-sm font-semibold mb-1">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
              )}

              <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Created {project.created_at_basecamp ? new Date(project.created_at_basecamp).toLocaleDateString() : "—"}</span>
                <span>Synced {project.synced_at ? new Date(project.synced_at).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

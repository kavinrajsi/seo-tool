"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  UsersIcon,
  SearchIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  MailIcon,
  BuildingIcon,
  XIcon,
} from "lucide-react";

function sortPeople(list) {
  return [...list].sort((a, b) => {
    const aInactive = a.personable_type === "Tombstone" ? 1 : 0;
    const bInactive = b.personable_type === "Tombstone" ? 1 : 0;
    if (aInactive !== bInactive) return aInactive - bInactive;
    return new Date(a.created_at_basecamp || 0) - new Date(b.created_at_basecamp || 0);
  });
}

export default function BasecampPeople() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/basecamp/people");
        const data = await res.json();
        if (data.people) setPeople(sortPeople(data.people));
        if (data.last_synced) setLastSynced(data.last_synced);

        // Auto-sync in background if data is stale or empty
        if (data.stale || !data.people?.length) {
          setSyncing(true);
          try {
            const syncRes = await apiFetch("/api/basecamp/people?sync=1");
            const syncData = await syncRes.json();
            if (syncRes.ok && syncData.people) {
              setPeople(sortPeople(syncData.people));
              setLastSynced(syncData.last_synced);
            }
          } catch {}
          setSyncing(false);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      const res = await apiFetch("/api/basecamp/people?sync=1");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPeople(sortPeople(data.people || []));
      if (data.last_synced) setLastSynced(data.last_synced);
    } catch (err) {
      setError(err.message);
    }
    setSyncing(false);
  }

  function formatSyncTime(ts) {
    if (!ts) return null;
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const filtered = people.filter((p) => {
    if (p.personable_type === "DummyUser") return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(s) && !p.email?.toLowerCase().includes(s) && !p.company_name?.toLowerCase().includes(s)) return false;
    }
    if (filter === "client" && p.personable_type !== "Client") return false;
    return true;
  });


  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UsersIcon size={24} className="text-emerald-400" />
            People
          </h1>
          <p className="text-muted-foreground mt-1">
            {people.length} people in Basecamp
            {lastSynced && <span className="text-xs ml-2 opacity-70">· synced {formatSyncTime(lastSynced)}</span>}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors disabled:opacity-50"
        >
          <RefreshCwIcon size={12} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync from Basecamp"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          {error}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { value: "all", label: "All" },
            { value: "client", label: "Clients" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                filter === f.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* People list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <UsersIcon size={28} />
          <p className="text-sm">{people.length === 0 ? "No people yet. Click \"Sync from Basecamp\" to fetch." : "No matching people."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((person, i) => {
            const isTombstone = person.personable_type === "Tombstone";
            return (
              <div key={person.id} onClick={() => setSelectedPerson(person)} className={`flex items-center gap-4 px-4 py-3 cursor-pointer ${i < filtered.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/20 transition-colors`}>
                <div className={`relative shrink-0 w-10 h-10 ${isTombstone ? "opacity-40" : ""}`}>
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt={person.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <UsersIcon size={16} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      <span className={isTombstone ? "line-through text-muted-foreground" : ""}>{person.name}</span>
                      {isTombstone && person.updated_at_basecamp && (
                        <span className="text-[10px] text-red-400 ml-1">({new Date(person.updated_at_basecamp).toLocaleDateString()})</span>
                      )}
                    </p>
                    {person.personable_type === "Client" && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Client</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {person.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MailIcon size={10} /> {person.email}
                      </span>
                    )}
                    {person.title && <span className="text-xs text-muted-foreground truncate hidden sm:block">{person.title}</span>}
                    {person.company_name && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate hidden md:flex">
                        <BuildingIcon size={10} /> {person.company_name}
                      </span>
                    )}
                    {person.created_at_basecamp && (
                      <span className="text-xs text-muted-foreground hidden lg:block">
                        {new Date(person.created_at_basecamp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {person.app_url && (
                  <a href={person.app_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
                    View <ExternalLinkIcon size={10} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      {selectedPerson && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedPerson(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                {selectedPerson.avatar_url && <img src={selectedPerson.avatar_url} alt={selectedPerson.name} className="w-10 h-10 rounded-full object-cover" />}
                <h2 className="text-lg font-semibold truncate">{selectedPerson.name}</h2>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {selectedPerson.email && <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Email</p><p className="text-sm font-medium break-all">{selectedPerson.email}</p></div>}
                {selectedPerson.title && <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Title</p><p className="text-sm font-medium">{selectedPerson.title}</p></div>}
                {selectedPerson.company_name && <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Company</p><p className="text-sm font-medium">{selectedPerson.company_name}</p></div>}
                <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Type</p><p className="text-sm font-medium">{selectedPerson.personable_type || "User"}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Admin</p><p className="text-sm font-medium">{selectedPerson.admin ? "Yes" : "No"}</p></div>
                <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground mb-1">Owner</p><p className="text-sm font-medium">{selectedPerson.owner ? "Yes" : "No"}</p></div>
              </div>
              {selectedPerson.app_url && (
                <a href={selectedPerson.app_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                  Open in Basecamp <ExternalLinkIcon size={14} />
                </a>
              )}
              <details>
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Raw data</summary>
                <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-4 border border-border">{JSON.stringify(selectedPerson, null, 2)}</pre>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
  ShieldIcon,
  CrownIcon,
  XIcon,
} from "lucide-react";

export default function BasecampPeople() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => { loadPeople(); }, []);

  async function loadPeople() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/basecamp/people");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPeople(data.people || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const filtered = people.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(s) && !p.email_address?.toLowerCase().includes(s) && !p.company?.name?.toLowerCase().includes(s)) return false;
    }
    if (filter === "admin" && !p.admin) return false;
    if (filter === "owner" && !p.owner) return false;
    if (filter === "client" && p.personable_type !== "Client") return false;
    return true;
  });

  const adminCount = people.filter((p) => p.admin).length;
  const ownerCount = people.filter((p) => p.owner).length;
  const clientCount = people.filter((p) => p.personable_type === "Client").length;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground gap-2">
        <RefreshCwIcon size={16} className="animate-spin" /> Loading people from Basecamp...
      </div>
    );
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
          <p className="text-muted-foreground mt-1">{people.length} people in Basecamp</p>
        </div>
        <button onClick={loadPeople} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors">
          <RefreshCwIcon size={12} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{people.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{adminCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Admins</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{ownerCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Owners</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{clientCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Clients</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { value: "all", label: "All" },
            { value: "admin", label: "Admins" },
            { value: "owner", label: "Owners" },
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
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <UsersIcon size={28} />
          <p className="text-sm">{people.length === 0 ? "No people found." : "No matching people."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((person, i) => {
            const isTombstone = person.personable_type === "Tombstone";
            return (
              <div key={person.id} onClick={() => setSelectedPerson(person)} className={`flex items-center gap-4 px-4 py-3 cursor-pointer ${i < filtered.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/20 transition-colors`}>
                {/* Avatar */}
                <div className={`relative shrink-0 w-10 h-10 ${isTombstone ? "opacity-40" : ""}`}>
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt={person.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <UsersIcon size={16} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      <span className={isTombstone ? "line-through text-muted-foreground" : ""}>{person.name}</span>
                    </p>
                    {person.owner && (
                      <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                        <CrownIcon size={10} /> Owner
                      </span>
                    )}
                    {person.admin && !person.owner && (
                      <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        <ShieldIcon size={10} /> Admin
                      </span>
                    )}
                    {person.personable_type === "Client" && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Client</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {person.email_address && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MailIcon size={10} /> {person.email_address}
                      </span>
                    )}
                    {person.title && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:block">{person.title}</span>
                    )}
                    {person.company?.name && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate hidden md:flex">
                        <BuildingIcon size={10} /> {person.company.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Link */}
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
                {selectedPerson.avatar_url && (
                  <img src={selectedPerson.avatar_url} alt={selectedPerson.name} className="w-10 h-10 rounded-full object-cover" />
                )}
                <h2 className="text-lg font-semibold truncate">{selectedPerson.name}</h2>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent">
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {selectedPerson.email_address && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Email</p>
                    <p className="text-sm font-medium break-all">{selectedPerson.email_address}</p>
                  </div>
                )}
                {selectedPerson.title && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Title</p>
                    <p className="text-sm font-medium">{selectedPerson.title}</p>
                  </div>
                )}
                {selectedPerson.company?.name && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Company</p>
                    <p className="text-sm font-medium">{selectedPerson.company.name}</p>
                  </div>
                )}
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium">{selectedPerson.personable_type || "User"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Admin</p>
                  <p className="text-sm font-medium">{selectedPerson.admin ? "Yes" : "No"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Owner</p>
                  <p className="text-sm font-medium">{selectedPerson.owner ? "Yes" : "No"}</p>
                </div>
              </div>
              {selectedPerson.app_url && (
                <a href={selectedPerson.app_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                  Open in Basecamp <ExternalLinkIcon size={14} />
                </a>
              )}
              <details>
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Raw data</summary>
                <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-4 border border-border">
                  {JSON.stringify(selectedPerson, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

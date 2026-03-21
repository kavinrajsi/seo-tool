"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import {
  UsersIcon,
  RefreshCwIcon,
  SearchIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
  ShieldIcon,
  CrownIcon,
  MailIcon,
  BuildingIcon,
} from "lucide-react";

export default function BasecampPeople() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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
        .from("basecamp_people")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (stored) setPeople(stored);
      setLoading(false);
    })();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      const res = await apiFetch("/api/basecamp/people");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPeople(data.people);
    } catch (err) {
      setError(err.message);
    }
    setSyncing(false);
  }

  const filtered = people.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "admin" && !p.admin) return false;
    if (filter === "owner" && !p.owner) return false;
    return true;
  });

  const adminCount = people.filter((p) => p.admin).length;
  const ownerCount = people.filter((p) => p.owner).length;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <UsersIcon size={40} className="text-emerald-400" />
        <h2 className="text-lg font-bold">Connect Basecamp</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Connect your Basecamp account in Settings to view people.
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
            <UsersIcon size={24} className="text-emerald-400" />
            People
          </h1>
          <p className="text-muted-foreground mt-1">{people.length} people in Basecamp</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white flex items-center gap-2 transition-colors"
        >
          <RefreshCwIcon size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync People"}
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
          <p className="text-2xl font-bold">{people.length}</p>
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
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
          <p className="text-sm">{people.length === 0 ? "No people yet. Click sync to fetch from Basecamp." : "No matching people."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((person, i) => (
            <div key={person.id} className={`flex items-center gap-4 px-4 py-3 ${i < filtered.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/20 transition-colors`}>
              {/* Avatar */}
              <div className="relative shrink-0 w-12 h-12">
                {person.avatar_url ? (
                  <img src={person.avatar_url} alt={person.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <UsersIcon size={18} />
                  </div>
                )}
                {person.owner && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border-2 border-card flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                  </span>
                )}
                {person.admin && !person.owner && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border-2 border-card flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{person.name}</p>
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
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {person.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <MailIcon size={10} /> {person.email}
                    </span>
                  )}
                  {person.title && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:block">
                      {person.title}
                    </span>
                  )}
                  {person.company_name && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground truncate hidden md:flex">
                      <BuildingIcon size={10} /> {person.company_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {person.app_url && (
                <a
                  href={person.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                  View <ExternalLinkIcon size={10} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

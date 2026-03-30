"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  AtSignIcon,
  InboxIcon,
  MessageSquareIcon,
  BellIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
  LoaderIcon,
  UserIcon,
} from "lucide-react";

const SECTIONS = [
  { value: "all",       label: "All",       icon: BellIcon },
  { value: "mentions",  label: "@Mentions", icon: AtSignIcon },
  { value: "inbox",     label: "Inbox",     icon: InboxIcon },
  { value: "chats",     label: "Chats",     icon: MessageSquareIcon },
  { value: "pings",     label: "Pings",     icon: UserIcon },
  { value: "remembered",label: "Memories",  icon: BookmarkIcon },
];

const TABS = [
  { value: "unreads",  label: "Unread" },
  { value: "reads",    label: "Read" },
  { value: "memories", label: "Memories" },
];

// Basecamp sends @mentions in comment replies as section:"inbox" not section:"mentions"
// So we detect mentions by section OR by presence of "@" in content_excerpt
function isMention(item) {
  if (item.section === "mentions") return true;
  if (item.content_excerpt?.includes("@")) return true;
  return false;
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ReadingItem({ item, onClick }) {
  const isUnread = !item.read_at;
  return (
    <div
      onClick={() => onClick(item)}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors border-b border-border/40 last:border-0 ${isUnread ? "bg-emerald-500/5" : ""}`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {item.creator?.avatar_url ? (
          <img src={item.creator.avatar_url} alt={item.creator.name} className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
            {item.creator?.name?.[0] || "?"}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}>
            {item.title || "Untitled"}
          </p>
          {isMention(item) && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium shrink-0">
              @mention
            </span>
          )}
          {item.section && item.section !== "mentions" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium shrink-0">
              {item.section}
            </span>
          )}
          {isUnread && item.unread_count > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium shrink-0">
              {item.unread_count} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {item.creator?.name && <span>{item.creator.name}</span>}
          {item.bucket_name && <span>· {item.bucket_name}</span>}
          <span>· {timeAgo(item.updated_at || item.created_at)}</span>
        </div>
        {item.content_excerpt && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.content_excerpt}</p>
        )}
      </div>

      {item.app_url && (
        <a
          href={item.app_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
        >
          <ExternalLinkIcon size={14} />
        </a>
      )}
    </div>
  );
}

export default function BasecampMe() {
  const [data, setData] = useState({ unreads: [], reads: [], memories: [], total: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("unreads");
  const [section, setSection] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/basecamp/readings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const items = data[tab] || [];

  const filtered = items.filter((item) => {
    if (section === "mentions" && !isMention(item)) return false;
    if (section !== "all" && section !== "mentions" && item.section !== section) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !item.title?.toLowerCase().includes(s) &&
        !item.bucket_name?.toLowerCase().includes(s) &&
        !item.creator?.name?.toLowerCase().includes(s) &&
        !item.content_excerpt?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const mentionCount = (data.unreads || []).filter(isMention).length;
  const totalUnread = (data.unreads || []).length;
  const totalReads = (data.reads || []).length;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BellIcon size={24} className="text-emerald-400" />
            My Readings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {totalUnread} unread · {mentionCount} @mentions · {totalReads} read
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors disabled:opacity-50"
        >
          {loading ? <LoaderIcon size={12} className="animate-spin" /> : <RefreshCwIcon size={12} />} Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{(data.unreads || []).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Unread</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{mentionCount}</p>
          <p className="text-xs text-muted-foreground mt-1">@Mentions</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{(data.memories || []).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Memories</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setSection("all"); setSearch(""); }}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === t.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.value === "reads" && totalReads > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {totalReads}
              </span>
            )}
            {t.value === "unreads" && totalUnread > 0 && (
              <span className="ml-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Section filter */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSection(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              section === value
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            <Icon size={11} />
            {label}
            {value === "mentions" && mentionCount > 0 && (
              <span className="bg-blue-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                {mentionCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by title, project, person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <LoaderIcon size={18} className="animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <BellIcon size={28} />
          <p className="text-sm">{error}</p>
          <button onClick={load} className="text-xs text-primary hover:underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <BellIcon size={28} />
          <p className="text-sm">
            {items.length === 0 ? `No ${tab} items.` : "No matching items."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((item) => (
            <ReadingItem key={item.id} item={item} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold truncate">{selected.title || "Detail"}</h2>
              <button onClick={() => setSelected(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent">
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Creator */}
              {selected.creator && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  {selected.creator.avatar_url ? (
                    <img src={selected.creator.avatar_url} alt={selected.creator.name} className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {selected.creator.name?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{selected.creator.name}</p>
                    <p className="text-xs text-muted-foreground">{selected.creator.title || selected.creator.email_address}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Section</p>
                  <p className="text-sm font-medium capitalize">{selected.section || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Project</p>
                  <p className="text-sm font-medium truncate">{selected.bucket_name || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Unread updates</p>
                  <p className="text-sm font-medium">{selected.unread_count ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Subscribed</p>
                  <p className={`text-sm font-medium ${selected.subscribed ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {selected.subscribed ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {selected.content_excerpt && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Preview</p>
                  <p className="text-sm text-foreground/80">{selected.content_excerpt}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selected.read_at && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Read at</p>
                    <p className="text-xs font-medium">{new Date(selected.read_at).toLocaleString()}</p>
                  </div>
                )}
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Updated</p>
                  <p className="text-xs font-medium">{new Date(selected.updated_at || selected.created_at).toLocaleString()}</p>
                </div>
              </div>

              {selected.app_url && (
                <a
                  href={selected.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  Open in Basecamp <ExternalLinkIcon size={14} />
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

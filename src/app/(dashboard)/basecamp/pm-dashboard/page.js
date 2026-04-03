"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboardIcon, PlusIcon, PencilIcon, XIcon, LoaderIcon,
  CheckIcon, ExternalLinkIcon, RefreshCwIcon, AlertTriangleIcon,
} from "lucide-react";

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

const STATUS_OPTIONS = [
  { value: "green",  label: "On Track",  emoji: "🟢", color: "#22c55e" },
  { value: "yellow", label: "At Risk",   emoji: "🟡", color: "#eab308" },
  { value: "red",    label: "Blocked",   emoji: "🔴", color: "#ef4444" },
];

function StatusDot({ status, size = 10 }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  if (!opt) return null;
  return (
    <span title={opt.label} style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", backgroundColor: opt.color, flexShrink: 0 }} />
  );
}

function timeAgo(ts) {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ── Editor drawer ─────────────────────────────────────────────────────────────
function EditorDrawer({ project, onClose, onSaved }) {
  const [status, setStatus]   = useState(project.status ?? "green");
  const [onTrack, setOnTrack] = useState("");
  const [atRisk, setAtRisk]   = useState("");
  const [blocked, setBlocked] = useState("");
  const [nextWeek, setNextWeek] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const isNew = !project.doc_id;

  async function save() {
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const h = await authHeader();
    const res = await fetch("/api/basecamp/pm-dashboard", {
      method: "POST", headers: h,
      body: JSON.stringify({
        project_id: project.project_id,
        project_name: project.project_name,
        vault_id: project.vault_id,
        doc_id: project.doc_id ?? null,
        status,
        on_track: onTrack,
        at_risk: atRisk,
        blocked,
        next_week: nextWeek,
        updated_by: user?.email?.split("@")[0] ?? "",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
    } else {
      onSaved(data);
    }
    setSaving(false);
  }

  const fieldClass = "w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none placeholder:text-muted-foreground";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold">{isNew ? "Create" : "Update"} PM Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-72">{project.project_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted/60 transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Overall Status</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all flex-1 justify-center ${status === opt.value ? "shadow-sm" : "border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground"}`}
                  style={status === opt.value ? { borderColor: opt.color + "60", backgroundColor: opt.color + "15", color: opt.color } : {}}>
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* On Track */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              ✅ What's On Track
            </label>
            <textarea value={onTrack} onChange={(e) => setOnTrack(e.target.value)}
              rows={3} placeholder={"One item per line:\nHomepage redesign — delivered on schedule\nAPI integration — 80% complete"} className={fieldClass} />
          </div>

          {/* At Risk */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              ⚠️ What's At Risk
            </label>
            <textarea value={atRisk} onChange={(e) => setAtRisk(e.target.value)}
              rows={3} placeholder={"One item per line:\nContent delivery — waiting on client approval\nLoad testing — needs 2 more days"} className={fieldClass} />
          </div>

          {/* Blocked */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              🚫 Who's Blocked
            </label>
            <textarea value={blocked} onChange={(e) => setBlocked(e.target.value)}
              rows={3} placeholder={"One item per line:\nRavi — waiting for design sign-off from client\nPriya — needs access to staging server"} className={fieldClass} />
          </div>

          {/* Next Week */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              🎯 Next Week's Priorities
            </label>
            <textarea value={nextWeek} onChange={(e) => setNextWeek(e.target.value)}
              rows={3} placeholder={"One item per line (in priority order):\nComplete QA pass on checkout flow\nPresent to client on Thursday\nDeploy v2 to staging"} className={fieldClass} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangleIcon size={13} /> {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Each line becomes a bullet point in the Basecamp document. Leave a section blank to mark it as "—".
          </p>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? <LoaderIcon size={14} className="animate-spin" /> : (isNew ? <PlusIcon size={14} /> : <CheckIcon size={14} />)}
              {isNew ? "Create in Basecamp" : "Update in Basecamp"}
            </button>
            <button onClick={onClose} className="px-4 rounded-lg border border-border text-sm hover:bg-muted/60 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PMDashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // project being edited
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const h = await authHeader();
    const res = await fetch("/api/basecamp/pm-dashboard", { headers: h });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load projects");
    } else {
      setProjects(data.projects ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(result) {
    setProjects((prev) => prev.map((p) =>
      p.project_id === selected.project_id
        ? { ...p, doc_id: result.doc_id, doc_url: result.doc_url, status: selected._draftStatus, last_updated: new Date().toISOString() }
        : p
    ));
    setSelected(null);
  }

  const filtered = projects.filter((p) =>
    !search || p.project_name.toLowerCase().includes(search.toLowerCase())
  );

  const withDashboard = filtered.filter((p) => p.doc_id);
  const withoutDashboard = filtered.filter((p) => !p.doc_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoaderIcon size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <LayoutDashboardIcon size={22} className="text-primary" />
          <div>
            <h1 className="text-xl font-semibold">PM Dashboard</h1>
            <p className="text-sm text-muted-foreground">Weekly status docs pinned to each Basecamp project</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <RefreshCwIcon size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertTriangleIcon size={15} /> {error}
        </div>
      )}

      {/* Search */}
      {projects.length > 5 && (
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-muted-foreground" />
      )}

      {/* Projects with a dashboard */}
      {withDashboard.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Active Dashboards ({withDashboard.length})
          </p>
          {withDashboard.map((p) => {
            const opt = STATUS_OPTIONS.find((s) => s.value === p.status);
            return (
              <div key={p.project_id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                <StatusDot status={p.status} size={12} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.project_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {opt && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                        style={{ color: opt.color, borderColor: opt.color + "40", backgroundColor: opt.color + "15" }}>
                        {opt.emoji} {opt.label}
                      </span>
                    )}
                    {p.last_updated && (
                      <span className="text-[10px] text-muted-foreground">Updated {timeAgo(p.last_updated)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.doc_url && (
                    <a href={p.doc_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors" title="Open in Basecamp">
                      <ExternalLinkIcon size={14} />
                    </a>
                  )}
                  <button onClick={() => setSelected(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted/60 transition-colors">
                    <PencilIcon size={12} /> Update
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Projects without a dashboard */}
      {withoutDashboard.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            No Dashboard Yet ({withoutDashboard.length})
          </p>
          {withoutDashboard.map((p) => (
            <div key={p.project_id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-dashed border-border bg-card/50 hover:border-border transition-colors">
              <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{p.project_name}</p>
              </div>
              {p.vault_id ? (
                <button onClick={() => setSelected(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0">
                  <PlusIcon size={12} /> Create
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground shrink-0">Vault unavailable</span>
              )}
            </div>
          ))}
        </div>
      )}

      {projects.length === 0 && !error && (
        <div className="text-center py-20 text-muted-foreground">
          <LayoutDashboardIcon size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active Basecamp projects found</p>
        </div>
      )}

      {/* Editor drawer */}
      {selected && (
        <EditorDrawer
          project={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  GaugeIcon, PencilIcon, CheckIcon, XIcon, LoaderIcon,
  AlertTriangleIcon, UsersIcon, ShieldAlertIcon, ActivityIcon,
} from "lucide-react";

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

const LOAD_LEVELS = [
  { n: 1, emoji: "🟢", label: "Very Light", color: "#22c55e" },
  { n: 2, emoji: "🟡", label: "Light",      color: "#eab308" },
  { n: 3, emoji: "🟠", label: "Moderate",   color: "#f97316" },
  { n: 4, emoji: "🔴", label: "Heavy",      color: "#ef4444" },
  { n: 5, emoji: "⛔", label: "Overwhelmed", color: "#991b1b" },
];

const AVATAR_COLORS = [
  "bg-blue-500","bg-purple-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500",
];

function avatarColor(id) {
  return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length];
}

function initials(name) {
  const parts = name.trim().split(" ");
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

function weekLabel(weekStart) {
  const mon = new Date(weekStart + "T00:00:00");
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const fmt = (d) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `${fmt(mon)} – ${fmt(fri)}`;
}

function LoadBadge({ scale }) {
  if (!scale) return <span className="text-xs text-muted-foreground">No check-in</span>;
  const lvl = LOAD_LEVELS[scale - 1];
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
      style={{ color: lvl.color, borderColor: lvl.color + "40", backgroundColor: lvl.color + "15" }}>
      {lvl.emoji} {lvl.label}
    </span>
  );
}

// ── My Check-in tab ───────────────────────────────────────────────────────────
function CheckinTab({ weekStart, checkin, history, onSaved }) {
  const isFriday = new Date().getDay() === 5;
  const [loadScale, setLoadScale] = useState(checkin?.load_scale ?? null);
  const [atRisk, setAtRisk] = useState(checkin?.at_risk ?? false);
  const [notes, setNotes] = useState(checkin?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasExisting = !!checkin;

  async function submit() {
    if (!loadScale) return;
    setSaving(true);
    const h = await authHeader();
    await fetch("/api/capacity", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "submit_checkin", load_scale: loadScale, at_risk: atRisk, notes }),
    });
    setSaving(false);
    setSaved(true);
    onSaved();
  }

  const prevHistory = history.filter((h) => h.week_start !== weekStart);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Week header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground">Week of</p>
          <p className="font-semibold">{weekLabel(weekStart)}</p>
        </div>
        {isFriday && (
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full">
            Friday — good time to check in!
          </span>
        )}
        {(hasExisting || saved) && (
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full flex items-center gap-1">
            <CheckIcon size={9} /> Submitted — you can still update
          </span>
        )}
      </div>

      {/* Load scale picker */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-3">
        <p className="text-sm font-medium">How loaded do you feel this week?</p>
        <div className="flex flex-wrap gap-2">
          {LOAD_LEVELS.map(({ n, emoji, label, color }) => (
            <button key={n} type="button" onClick={() => setLoadScale(n)}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all ${
                loadScale === n
                  ? "shadow-sm"
                  : "border-border bg-muted/30 hover:bg-muted/60"
              }`}
              style={loadScale === n ? { borderColor: color + "60", backgroundColor: color + "15", color } : {}}>
              <span className="text-2xl">{emoji}</span>
              <span className="text-[11px] font-medium">{n}</span>
              <span className="text-[10px] leading-tight text-center w-16 opacity-70">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* At-risk toggle */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <label className="flex items-center justify-between cursor-pointer gap-4">
          <div>
            <p className="text-sm font-medium">Is anything at risk of missing its deadline?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Flag tasks or projects that need attention</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {atRisk && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangleIcon size={9} /> At Risk
              </span>
            )}
            <button type="button" onClick={() => setAtRisk((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${atRisk ? "bg-amber-500" : "bg-muted-foreground/30"}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${atRisk ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </label>
      </div>

      {/* Notes */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-2">
        <p className="text-sm font-medium">Anything else to share? <span className="text-muted-foreground font-normal">(optional)</span></p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={3} placeholder="Any context — blockers, concerns, or wins..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
      </div>

      {/* Submit */}
      <button onClick={submit} disabled={!loadScale || saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {saving ? <LoaderIcon size={14} className="animate-spin" /> : <CheckIcon size={14} />}
        {hasExisting || saved ? "Update Check-in" : "Save Check-in"}
      </button>

      {/* History */}
      {prevHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Previous weeks</p>
          {prevHistory.map((h) => (
            <div key={h.week_start} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card/60 opacity-60 hover:opacity-100 transition-opacity">
              <span className="text-xs text-muted-foreground w-28 shrink-0">Week of {weekLabel(h.week_start).split("–")[0].trim()}</span>
              <LoadBadge scale={h.load_scale} />
              {h.at_risk && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangleIcon size={9} /> At Risk
                </span>
              )}
              {h.notes && <span className="text-xs text-muted-foreground truncate flex-1">{h.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Team dashboard tab ────────────────────────────────────────────────────────
function TeamTab({ weekStart, team, wipLimit: initialWip, onRefresh }) {
  const [wipLimit, setWipLimit] = useState(initialWip);
  const [editingWip, setEditingWip] = useState(false);
  const [wipDraft, setWipDraft] = useState(String(initialWip));
  const [savingWip, setSavingWip] = useState(false);

  const checkedIn = team.filter((e) => e.checkin).length;
  const atRiskCount = team.filter((e) => e.checkin?.at_risk).length;
  const overWipCount = team.filter((e) => e.over_wip).length;
  const allNullTodos = team.every((e) => e.todo_count === null);

  async function saveWip() {
    const n = parseInt(wipDraft, 10);
    if (!n || n < 1) return;
    setSavingWip(true);
    const h = await authHeader();
    await fetch("/api/capacity", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "update_wip_limit", wip_limit: n }),
    });
    setWipLimit(n);
    setSavingWip(false);
    setEditingWip(false);
    onRefresh();
  }

  const sorted = [...team].sort((a, b) => {
    const aUrgent = (a.checkin?.at_risk ? 1 : 0) + (a.over_wip ? 1 : 0);
    const bUrgent = (b.checkin?.at_risk ? 1 : 0) + (b.over_wip ? 1 : 0);
    if (aUrgent !== bUrgent) return bUrgent - aUrgent;
    if ((b.checkin?.load_scale ?? 0) !== (a.checkin?.load_scale ?? 0))
      return (b.checkin?.load_scale ?? 0) - (a.checkin?.load_scale ?? 0);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Week of</p>
          <p className="font-semibold">{weekLabel(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">WIP Limit:</span>
          {editingWip ? (
            <div className="flex items-center gap-1">
              <input type="number" min="1" max="50" value={wipDraft}
                onChange={(e) => setWipDraft(e.target.value)}
                autoFocus
                className="w-14 px-2 py-1 text-sm border border-primary/50 rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/60 text-center" />
              <button onClick={saveWip} disabled={savingWip}
                className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {savingWip ? <LoaderIcon size={12} className="animate-spin" /> : <CheckIcon size={12} />}
              </button>
              <button onClick={() => { setEditingWip(false); setWipDraft(String(wipLimit)); }}
                className="p-1.5 rounded border border-border hover:bg-muted/60 transition-colors">
                <XIcon size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingWip(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/40 text-sm hover:bg-muted/60 transition-colors">
              {wipLimit} tasks <PencilIcon size={11} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{checkedIn}<span className="text-sm text-muted-foreground font-normal">/{team.length}</span></p>
          <p className="text-xs text-muted-foreground mt-1">Checked In</p>
        </div>
        <div className={`rounded-xl border bg-card p-4 text-center ${atRiskCount > 0 ? "border-amber-500/30" : "border-border"}`}>
          <p className={`text-2xl font-bold ${atRiskCount > 0 ? "text-amber-400" : ""}`}>{atRiskCount}</p>
          <p className="text-xs text-muted-foreground mt-1">At Risk</p>
        </div>
        <div className={`rounded-xl border bg-card p-4 text-center ${overWipCount > 0 ? "border-red-500/30" : "border-border"}`}>
          <p className={`text-2xl font-bold ${overWipCount > 0 ? "text-red-400" : ""}`}>{overWipCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Over WIP</p>
        </div>
      </div>

      {/* Team list */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UsersIcon size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active employees found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((emp) => (
            <div key={emp.employee_id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-card transition-colors ${emp.over_wip ? "border-red-500/30" : "border-border"}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(emp.employee_id)}`}>
                {initials(emp.name).toUpperCase()}
              </div>
              {/* Name + designation */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{emp.name}</p>
                {emp.designation && <p className="text-xs text-muted-foreground truncate">{emp.designation}</p>}
              </div>
              {/* Load badge */}
              <LoadBadge scale={emp.checkin?.load_scale} />
              {/* At-risk badge */}
              {emp.checkin?.at_risk && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <AlertTriangleIcon size={9} /> At Risk
                </span>
              )}
              {/* Todo count */}
              <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
                {emp.todo_count === null ? "–" : `${emp.todo_count} todos`}
              </span>
              {/* Over WIP */}
              {emp.over_wip && (
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <ShieldAlertIcon size={9} /> Over WIP
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CapacityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [tab, setTab] = useState("checkin");

  const fetchPersonal = useCallback(async () => {
    const h = await authHeader();
    const res = await fetch("/api/capacity", { headers: h });
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, []);

  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    const h = await authHeader();
    const res = await fetch("/api/capacity?view=team", { headers: h });
    const d = await res.json();
    setTeamData(d);
    setTeamLoading(false);
  }, []);

  useEffect(() => { fetchPersonal(); }, [fetchPersonal]);

  function switchTab(t) {
    setTab(t);
    if (t === "team" && !teamData) fetchTeam();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoaderIcon size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <GaugeIcon size={22} className="text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Capacity Check-in</h1>
          <p className="text-sm text-muted-foreground">Track workload and flag burnout risk early</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        <button onClick={() => switchTab("checkin")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "checkin" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <span className="flex items-center gap-1.5"><ActivityIcon size={13} /> My Check-in</span>
        </button>
        {data?.is_admin && (
          <button onClick={() => switchTab("team")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "team" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <span className="flex items-center gap-1.5"><UsersIcon size={13} /> Team Dashboard</span>
          </button>
        )}
      </div>

      {/* Tab content */}
      {tab === "checkin" && data && (
        <CheckinTab
          weekStart={data.week_start}
          checkin={data.checkin}
          history={data.history}
          onSaved={fetchPersonal}
        />
      )}

      {tab === "team" && (
        teamLoading || !teamData ? (
          <div className="flex items-center justify-center py-32">
            <LoaderIcon size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TeamTab
            weekStart={teamData.week_start}
            team={teamData.team}
            wipLimit={teamData.wip_limit}
            onRefresh={fetchTeam}
          />
        )
      )}
    </div>
  );
}

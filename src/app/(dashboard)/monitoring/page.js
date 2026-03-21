"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  BellIcon,
  PlusIcon,
  TrashIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react";

/* Sparkline */
function Sparkline({ data, width = 120, height = 32 }) {
  if (data.length < 2) return <div style={{ width, height }} />;
  const scores = data.map((d) => d.score);
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 2 - ((d.score - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height}>
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
    </svg>
  );
}

export default function Monitoring() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [user, setUser] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [history, setHistory] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [threshold, setThreshold] = useState(10);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setAlertEmail(data.user.email);
      }
    });
  }, []);

  // Auto-fill URL from active project domain
  useEffect(() => {
    if (activeProject?.domain) {
      const domain = activeProject.domain.replace(/^https?:\/\//, "");
      setNewUrl(domain);
    }
  }, [activeProject]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let mQuery = supabase.from("monitored_urls").select("*").order("created_at", { ascending: true });
    if (activeTeam) {
      mQuery = mQuery.eq("team_id", activeTeam.id);
    } else {
      mQuery = mQuery.eq("user_id", user.id).is("team_id", null);
    }
    if (activeProject) {
      mQuery = mQuery.eq("project_id", activeProject.id);
    }
    const { data: urls } = await mQuery;
    setMonitors(urls || []);

    // Load history for each monitor
    if (urls?.length) {
      const ids = urls.map((u) => u.id);
      const { data: hist } = await supabase
        .from("monitoring_history")
        .select("*")
        .in("monitor_id", ids)
        .order("created_at", { ascending: true });

      const grouped = {};
      for (const h of hist || []) {
        if (!grouped[h.monitor_id]) grouped[h.monitor_id] = [];
        grouped[h.monitor_id].push(h);
      }
      setHistory(grouped);

      // Load recent alerts
      const { data: alertData } = await supabase
        .from("alert_history")
        .select("*")
        .in("monitor_id", ids)
        .order("created_at", { ascending: false })
        .limit(10);
      setAlerts(alertData || []);
    }

    setLoading(false);
  }, [user, activeTeam, activeProject]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newUrl.trim() || !user) return;
    setAdding(true);
    setError("");

    let urlToMonitor = newUrl.trim();
    if (!urlToMonitor.startsWith("http")) urlToMonitor = "https://" + urlToMonitor;

    const { error: insertErr } = await supabase.from("monitored_urls").insert({
      user_id: user.id,
      team_id: activeTeam?.id || null,
      project_id: activeProject?.id || null,
      url: urlToMonitor,
      alert_email: alertEmail || user.email,
      alert_threshold: threshold,
      active: true,
    });

    if (insertErr) {
      setError(insertErr.message);
    } else {
      setNewUrl("");
      await loadData();
    }
    setAdding(false);
  }

  async function handleDelete(id) {
    await supabase.from("monitored_urls").delete().eq("id", id);
    loadData();
  }

  async function handleToggle(monitor) {
    await supabase.from("monitored_urls").update({ active: !monitor.active }).eq("id", monitor.id);
    loadData();
  }

  async function handleManualCheck(monitor) {
    setError("");
    try {
      const res = await apiFetch("/api/monitor/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitorId: monitor.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SEO Monitoring</h1>
        <p className="text-muted-foreground mt-1">
          Auto-check URLs every 6 hours and get email alerts when scores drop.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Add monitor form */}
      <form onSubmit={handleAdd} className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-medium">Add URL to Monitor</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="URL to monitor (e.g. example.com)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            required
            className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            {adding ? "Adding..." : "Monitor"}
          </button>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Alert email:</label>
            <input
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Alert on drop of:</label>
            <select
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value={5}>5+ points</option>
              <option value={10}>10+ points</option>
              <option value={15}>15+ points</option>
              <option value={20}>20+ points</option>
            </select>
          </div>
        </div>
      </form>

      {/* Monitored URLs */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCwIcon className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      ) : monitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <BellIcon className="h-10 w-10" />
          <p>No URLs being monitored. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {monitors.map((m) => {
            const hist = history[m.id] || [];
            const lastHist = hist[hist.length - 1];
            const prevHist = hist.length >= 2 ? hist[hist.length - 2] : null;
            const scoreDiff = prevHist ? m.last_score - prevHist.score : 0;

            return (
              <div key={m.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${m.active ? "bg-green-500" : "bg-zinc-500"}`} />
                      <h4 className="text-sm font-medium truncate">{m.url.replace(/^https?:\/\//, "")}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last checked: {m.last_checked ? new Date(m.last_checked).toLocaleString() : "Never"}
                      {m.alert_threshold && ` · Alert on ${m.alert_threshold}+ point drop`}
                    </p>
                  </div>

                  <Sparkline data={hist.slice(-20)} />

                  <div className="text-right shrink-0">
                    <div className={`text-2xl font-semibold font-mono ${
                      m.last_score >= 70 ? "text-green-400" : m.last_score >= 40 ? "text-orange-400" : m.last_score > 0 ? "text-red-400" : "text-muted-foreground"
                    }`}>
                      {m.last_score ?? "—"}
                    </div>
                    {scoreDiff !== 0 && (
                      <span className={`text-xs ${scoreDiff > 0 ? "text-green-400" : "text-red-400"}`}>
                        {scoreDiff > 0 ? "+" : ""}{scoreDiff}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => handleManualCheck(m)} className="rounded p-2 hover:bg-accent text-muted-foreground" title="Run check now">
                      <RefreshCwIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleToggle(m)} className="rounded p-2 hover:bg-accent text-muted-foreground" title={m.active ? "Pause" : "Resume"}>
                      {m.active ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="rounded p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Delete">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent alerts */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4 text-orange-400" />
            Recent Alerts
          </h3>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3">
                <p className="text-sm">{a.message}</p>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

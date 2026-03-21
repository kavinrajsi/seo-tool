"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import { QR_TYPES } from "@/lib/qr-types";
import {
  BarChart3Icon,
  ScanLineIcon,
  DownloadIcon,
  PlusCircleIcon,
  CalendarIcon,
  GlobeIcon,
  SmartphoneIcon,
  MonitorIcon,
  FilterIcon,
} from "lucide-react";

export default function QRAnalytics() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [user, setUser] = useState(null);
  const [qrcodes, setQrcodes] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState("all");
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); loadData(data.user); }
    });
  }, [activeTeam, activeProject]);

  async function loadData(u) {
    if (!u) return;
    setLoading(true);

    // Load QR codes
    let qrQuery = supabase.from("qr_codes").select("id, name, label, type, slug").order("created_at", { ascending: false });
    if (activeTeam) {
      qrQuery = qrQuery.eq("team_id", activeTeam.id);
    } else {
      qrQuery = qrQuery.eq("user_id", u.id).is("team_id", null);
    }
    const { data: codes } = await qrQuery;
    setQrcodes(codes || []);

    // Load analytics
    const since = new Date();
    since.setDate(since.getDate() - Number(dateRange));

    let analyticsQuery = supabase
      .from("qr_analytics")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (codes && codes.length > 0) {
      analyticsQuery = analyticsQuery.in("qr_code_id", codes.map(c => c.id));
    }

    const { data: events } = await analyticsQuery;
    setAnalytics(events || []);
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadData(user);
  }, [dateRange]);

  // Filter by selected QR code
  const filtered = selectedQR === "all"
    ? analytics
    : analytics.filter(a => a.qr_code_id === selectedQR);

  // Stats
  const scans = filtered.filter(a => a.event_type === "scan");
  const downloads = filtered.filter(a => a.event_type === "download");
  const created = filtered.filter(a => a.event_type === "created");

  // Scans by day for chart
  const scansByDay = {};
  scans.forEach(s => {
    const day = new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    scansByDay[day] = (scansByDay[day] || 0) + 1;
  });
  const chartDays = Object.entries(scansByDay).reverse();
  const maxScans = Math.max(...Object.values(scansByDay), 1);

  // Top UTM sources
  const utmSources = {};
  scans.forEach(s => {
    const src = s.utm_source || "direct";
    utmSources[src] = (utmSources[src] || 0) + 1;
  });
  const topSources = Object.entries(utmSources).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top QR codes by scans
  const scansByQR = {};
  scans.forEach(s => {
    scansByQR[s.qr_code_id] = (scansByQR[s.qr_code_id] || 0) + 1;
  });
  const topQRs = Object.entries(scansByQR)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const qr = qrcodes.find(q => q.id === id);
      return { id, name: qr?.label || qr?.name || id.slice(0, 8), count };
    });

  // Download formats breakdown
  const formatCounts = {};
  downloads.forEach(d => {
    const fmt = d.download_format || "unknown";
    formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
  });

  // Device breakdown from user_agent
  function getDevice(ua) {
    if (!ua) return "Unknown";
    if (/mobile|android|iphone/i.test(ua)) return "Mobile";
    if (/tablet|ipad/i.test(ua)) return "Tablet";
    return "Desktop";
  }
  const deviceCounts = {};
  scans.forEach(s => {
    const d = getDevice(s.user_agent);
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">QR Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track scans, downloads, and performance of your QR codes.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <select value={selectedQR} onChange={(e) => setSelectedQR(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="all">All QR Codes</option>
            {qrcodes.map(qr => (
              <option key={qr.id} value={qr.id}>{qr.label || qr.name || qr.slug}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ScanLineIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Scans</span>
          </div>
          <p className="text-2xl font-semibold">{scans.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DownloadIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Downloads</span>
          </div>
          <p className="text-2xl font-semibold">{downloads.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <PlusCircleIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Created</span>
          </div>
          <p className="text-2xl font-semibold">{created.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <BarChart3Icon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">QR Codes</span>
          </div>
          <p className="text-2xl font-semibold">{qrcodes.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scans over time */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Scans Over Time</h3>
          {chartDays.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No scans yet</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {chartDays.map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-all"
                    style={{ height: `${(count / maxScans) * 100}%` }}
                    title={`${day}: ${count} scans`}
                  />
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">{day}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top QR codes */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Top QR Codes by Scans</h3>
          {topQRs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No scan data yet</p>
          ) : (
            <div className="space-y-3">
              {topQRs.map((qr) => (
                <div key={qr.id} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{qr.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(qr.count / topQRs[0].count) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right">{qr.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UTM Sources */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 text-muted-foreground" /> Top Sources
          </h3>
          {topSources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No source data yet</p>
          ) : (
            <div className="space-y-2">
              {topSources.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                  <span className="text-sm font-medium">{source}</span>
                  <span className="text-xs font-mono text-muted-foreground">{count} scans</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device & Format breakdown */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <SmartphoneIcon className="h-4 w-4 text-muted-foreground" /> Devices
            </h3>
            {Object.keys(deviceCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No data</p>
            ) : (
              <div className="flex gap-3">
                {Object.entries(deviceCounts).map(([device, count]) => (
                  <div key={device} className="flex-1 rounded-md border border-border/50 p-3 text-center">
                    {device === "Mobile" ? <SmartphoneIcon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" /> : <MonitorIcon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />}
                    <p className="text-lg font-semibold">{count}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{device}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <DownloadIcon className="h-4 w-4 text-muted-foreground" /> Download Formats
            </h3>
            {Object.keys(formatCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No downloads</p>
            ) : (
              <div className="flex gap-3">
                {Object.entries(formatCounts).map(([fmt, count]) => (
                  <div key={fmt} className="flex-1 rounded-md border border-border/50 p-3 text-center">
                    <p className="text-lg font-semibold">{count}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{fmt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent events table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4">Recent Events</h3>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No events recorded yet. Share your tracking URLs to start collecting data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Event</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">QR Code</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Source</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground hidden md:table-cell">Device</th>
                  <th className="pb-2 font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((event) => {
                  const qr = qrcodes.find(q => q.id === event.qr_code_id);
                  return (
                    <tr key={event.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          event.event_type === "scan" ? "bg-blue-500/10 text-blue-400" :
                          event.event_type === "download" ? "bg-green-500/10 text-green-400" :
                          "bg-zinc-500/10 text-zinc-400"
                        }`}>
                          {event.event_type === "scan" && <ScanLineIcon className="h-3 w-3" />}
                          {event.event_type === "download" && <DownloadIcon className="h-3 w-3" />}
                          {event.event_type === "created" && <PlusCircleIcon className="h-3 w-3" />}
                          {event.event_type}
                          {event.download_format ? ` (${event.download_format})` : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs truncate max-w-[150px]">{qr?.label || qr?.name || "—"}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground hidden sm:table-cell">{event.utm_source || "direct"}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground hidden md:table-cell">{getDevice(event.user_agent)}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

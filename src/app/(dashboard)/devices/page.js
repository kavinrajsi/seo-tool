"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DEVICE_TYPES, VENDORS, STATUSES, STATUS_COLORS } from "@/lib/device-constants";
import {
  MonitorIcon, SearchIcon, PlusIcon, FilterIcon,
  ExternalLinkIcon, XIcon,
} from "lucide-react";

export default function DevicesList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    setLoading(true);
    const { data } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDevices(data);
    setLoading(false);
  }

  const filtered = devices.filter((d) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !d.device_id?.toLowerCase().includes(s) &&
        !d.serial_number?.toLowerCase().includes(s) &&
        !d.model_name?.toLowerCase().includes(s) &&
        !d.assigned_employee_name?.toLowerCase().includes(s)
      ) return false;
    }
    if (typeFilter !== "all" && d.device_type !== typeFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (vendorFilter !== "all" && d.vendor !== vendorFilter) return false;
    return true;
  });

  const statusCounts = {};
  for (const s of STATUSES) statusCounts[s] = devices.filter((d) => d.status === s).length;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MonitorIcon size={24} className="text-blue-400" />
            Device Management
          </h1>
          <p className="text-muted-foreground mt-1">{devices.length} devices registered</p>
        </div>
        <a href="/devices/add" className="flex items-center gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors">
          <PlusIcon size={14} /> Add Device
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)} className={`rounded-xl border p-4 text-center transition-colors ${statusFilter === s ? STATUS_COLORS[s] : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${statusFilter === s ? "" : s === "Available" ? "text-green-400" : s === "Assigned" ? "text-blue-400" : s === "In Repair" ? "text-orange-400" : "text-zinc-400"}`}>{statusCounts[s] || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{s}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by Device ID, Serial, Model, or Employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none">
          <option value="all">All Types</option>
          {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none">
          <option value="all">All Vendors</option>
          {VENDORS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Device list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <MonitorIcon size={32} />
          <p className="text-sm">{devices.length === 0 ? "No devices yet. Add your first device." : "No matching devices."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_100px_100px_100px_140px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>ID</span>
            <span>Device</span>
            <span>Type</span>
            <span>Vendor</span>
            <span>Status</span>
            <span>Assigned To</span>
          </div>
          {filtered.map((d, i) => (
            <a key={d.id} href={`/devices/${d.id}`} className={`grid grid-cols-[80px_1fr_100px_100px_100px_140px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
              <span className="text-xs font-mono text-muted-foreground">{d.device_id}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.model_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{d.serial_number}</p>
              </div>
              <span className="text-xs text-muted-foreground">{d.device_type}</span>
              <span className="text-xs text-muted-foreground">{d.vendor}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[d.status]}`}>
                {d.status}
              </span>
              <span className="text-xs text-muted-foreground truncate">{d.assigned_employee_name || "—"}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

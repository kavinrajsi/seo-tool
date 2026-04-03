"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DEVICE_TYPES, STATUSES, STATUS_COLORS, COMPLAINT_PRIORITIES, isLaptop } from "@/lib/device-constants";
import QRCode from "qrcode";
import {
  MonitorIcon, SearchIcon, PlusIcon,
  XIcon, DownloadIcon, UploadIcon,
  PencilIcon, ExternalLinkIcon, UserIcon, ClockIcon,
  AlertTriangleIcon, ArrowLeftRightIcon, CornerDownLeftIcon,
} from "lucide-react";

export default function DevicesList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showComplaint, setShowComplaint] = useState(false);
  const [assignForm, setAssignForm] = useState({ name: "", empId: "" });
  const [empSearch, setEmpSearch] = useState("");
  const [complaintForm, setComplaintForm] = useState({ reported_by: "", description: "", priority: "Medium" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDevices();
    supabase.from("device_vendors").select("name").order("name").then(({ data }) => {
      if (data) setVendors(data.map((v) => v.name));
    });
    supabase.from("employees").select("id, employee_number, first_name, last_name").neq("employee_status", "inactive").order("first_name").then(({ data }) => {
      if (data) setEmployees(data);
    });
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

  async function refreshSelected(id) {
    const { data } = await supabase.from("devices").select("*").eq("id", id).single();
    if (data) {
      setSelected(data);
      setDevices((prev) => prev.map((dev) => dev.id === id ? data : dev));
    }
  }

  async function regenerateQR(device, assignedName) {
    const qrPayload = {
      serial: device.serial_number, type: device.device_type, vendor: device.vendor,
      model: device.model_name, specs: device.specs || {},
      assigned_to: assignedName || null,
    };
    try { return await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 200 }); } catch { return device.qr_data; }
  }

  async function handleAssign() {
    if (!assignForm.name.trim() || !assignForm.empId.trim() || !selected) return;
    setSaving(true);
    const now = new Date().toISOString().split("T")[0];
    const history = [...(selected.assignment_history || [])];
    if (selected.assigned_employee_name) {
      history.push({
        employee_name: selected.assigned_employee_name,
        employee_id: selected.assigned_employee_id,
        assigned_date: selected.assignment_date,
        returned_date: now,
      });
    }
    const qrData = await regenerateQR(selected, assignForm.name.trim());
    await supabase.from("devices").update({
      assigned_employee_name: assignForm.name.trim(),
      assigned_employee_id: assignForm.empId.trim(),
      assignment_date: now,
      return_date: null,
      status: "Assigned",
      assignment_history: history,
      qr_data: qrData,
    }).eq("id", selected.id);
    setShowAssign(false);
    setAssignForm({ name: "", empId: "" });
    setSaving(false);
    await refreshSelected(selected.id);
  }

  async function handleReturn() {
    if (!selected) return;
    setSaving(true);
    const now = new Date().toISOString().split("T")[0];
    const history = [...(selected.assignment_history || [])];
    history.push({
      employee_name: selected.assigned_employee_name,
      employee_id: selected.assigned_employee_id,
      assigned_date: selected.assignment_date,
      returned_date: now,
    });
    const qrData = await regenerateQR(selected, null);
    await supabase.from("devices").update({
      assigned_employee_name: null,
      assigned_employee_id: null,
      assignment_date: null,
      return_date: now,
      status: "Available",
      assignment_history: history,
      qr_data: qrData,
    }).eq("id", selected.id);
    setSaving(false);
    await refreshSelected(selected.id);
  }

  async function handleComplaint() {
    if (!complaintForm.description.trim() || !selected) return;
    setSaving(true);
    const complaints = [...(selected.complaints || [])];
    complaints.push({
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      reported_by: complaintForm.reported_by.trim(),
      description: complaintForm.description.trim(),
      priority: complaintForm.priority,
      status: "Open",
      resolution: "",
    });
    await supabase.from("devices").update({ complaints, status: "In Repair" }).eq("id", selected.id);
    setShowComplaint(false);
    setComplaintForm({ reported_by: "", description: "", priority: "Medium" });
    setSaving(false);
    await refreshSelected(selected.id);
  }

  async function resolveComplaint(cId, resolution) {
    if (!selected) return;
    const complaints = (selected.complaints || []).map((c) =>
      c.id === cId ? { ...c, status: "Resolved", resolution, resolved_date: new Date().toISOString().split("T")[0] } : c
    );
    const hasOpen = complaints.some((c) => c.status !== "Resolved");
    await supabase.from("devices").update({ complaints, status: hasOpen ? "In Repair" : "Available" }).eq("id", selected.id);
    await refreshSelected(selected.id);
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

  function exportCSV() {
    const headers = ["Device ID", "Serial Number", "Device Type", "Vendor", "Model Name", "Purchase Date", "Status", "Assigned To", "Assigned Employee ID", "Assignment Date"];
    const rows = filtered.map((d) => [d.device_id, d.serial_number, d.device_type, d.vendor, d.model_name, d.purchase_date, d.status, d.assigned_employee_name, d.assigned_employee_id, d.assignment_date]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `devices-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const statusCounts = {};
  for (const s of STATUSES) statusCounts[s] = devices.filter((d) => d.status === s).length;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  const d = selected;
  const specs = d?.specs || {};
  const history = d?.assignment_history || [];
  const complaints = d?.complaints || [];
  const specSummary = d ? (isLaptop(d.device_type)
    ? [specs.proc_model, specs.ram_size, specs.storage_size, specs.os].filter(Boolean).join(" · ")
    : [specs.proc_model || specs.connection, specs.storage_size || specs.color, specs.os].filter(Boolean).join(" · ")
  ) : "";

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
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors">
            <DownloadIcon size={14} /> Export
          </button>
          <a href="/devices/import" className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors">
            <UploadIcon size={14} /> Import
          </a>
          <a href="/devices/add" className="flex items-center gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors">
            <PlusIcon size={14} /> Add Device
          </a>
        </div>
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
          <input type="text" placeholder="Search by Device ID, Serial, Model, or Employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none">
          <option value="all">All Types</option>
          {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none">
          <option value="all">All Vendors</option>
          {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
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
          <div className="grid grid-cols-[80px_1fr_100px_100px_100px_140px_50px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>ID</span>
            <span>Device</span>
            <span>Type</span>
            <span>Vendor</span>
            <span>Status</span>
            <span>Assigned To</span>
            <span></span>
          </div>
          {filtered.map((device, i) => (
            <div
              key={device.id}
              onClick={() => setSelected(device)}
              className={`grid grid-cols-[80px_1fr_100px_100px_100px_140px_50px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer ${i < filtered.length - 1 ? "border-b border-border/50" : ""} ${selected?.id === device.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
            >
              <span className="text-xs font-mono text-muted-foreground">{device.device_id}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{device.model_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{device.serial_number}</p>
              </div>
              <span className="text-xs text-muted-foreground">{device.device_type}</span>
              <span className="text-xs text-muted-foreground">{device.vendor}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[device.status]}`}>
                {device.status}
              </span>
              <span className="text-xs text-muted-foreground truncate">{device.assigned_employee_name || "—"}</span>
              <a
                href={`/devices/${device.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors w-fit"
                title="Edit device"
              >
                <PencilIcon size={14} />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Device Detail Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-border">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-mono">{d.device_id}</p>
                <h2 className="text-lg font-semibold truncate">{d.model_name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{d.device_type} · {d.vendor} · SN: {d.serial_number}</p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                <button onClick={() => setSelected(null)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors">
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {d.status === "Available" && (
                  <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md transition-colors"><UserIcon size={12} /> Assign</button>
                )}
                {d.status === "Assigned" && (
                  <>
                    <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md transition-colors"><ArrowLeftRightIcon size={12} /> Reassign</button>
                    <button onClick={handleReturn} disabled={saving} className="flex items-center gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors disabled:opacity-50"><CornerDownLeftIcon size={12} /> Return</button>
                  </>
                )}
                <a href={`/devices/${d.id}/edit`} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors"><PencilIcon size={12} /> Edit</a>
                <button onClick={() => setShowComplaint(true)} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors"><AlertTriangleIcon size={12} /> File Complaint</button>
                <a href={`/devices/${d.id}`} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors"><ExternalLinkIcon size={12} /> Detail View</a>
              </div>

              {/* Current Assignment */}
              {d.assigned_employee_name && (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Currently Assigned To</p>
                  <p className="text-sm font-medium">{d.assigned_employee_name} <span className="text-muted-foreground font-mono text-xs">({d.assigned_employee_id})</span></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Since {d.assignment_date}</p>
                </div>
              )}

              {/* QR Code & Label */}
              <div className="rounded-lg border border-border p-4">
                <div className="flex gap-3">
                  {d.qr_data && <img src={d.qr_data} alt="QR Code" className="w-24 h-24 rounded-lg" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{d.device_id}</p>
                    <p className="text-xs">{d.model_name}</p>
                    <p className="text-[10px] text-muted-foreground">{d.device_type} · {d.vendor}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">SN: {d.serial_number}</p>
                    {specSummary && <p className="text-[10px] text-muted-foreground mt-0.5">{specSummary}</p>}
                    {d.assigned_employee_name && <p className="text-[10px] mt-0.5">Assigned: {d.assigned_employee_name}</p>}
                  </div>
                </div>
              </div>

              {/* Purchase Date */}
              {d.purchase_date && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ClockIcon size={12} /> Purchased: {d.purchase_date}
                </div>
              )}

              {/* Specs */}
              {Object.keys(specs).length > 0 && (
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-xs font-medium mb-2">Specifications</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(specs).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="rounded border border-border/50 p-2">
                        <p className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                        <p className="text-xs font-medium">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment History */}
              {history.length > 0 && (
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-xs font-medium mb-2 flex items-center gap-1.5"><ClockIcon size={12} className="text-muted-foreground" /> Assignment History</h3>
                  <div className="space-y-1.5">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs rounded border border-border/50 px-2.5 py-1.5">
                        <p className="font-medium">{h.employee_name} <span className="text-muted-foreground font-mono text-[10px]">({h.employee_id})</span></p>
                        <p className="text-[10px] text-muted-foreground">{h.assigned_date} → {h.returned_date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complaints */}
              {complaints.length > 0 && (
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-xs font-medium mb-2 flex items-center gap-1.5"><AlertTriangleIcon size={12} className="text-muted-foreground" /> Complaints</h3>
                  <div className="space-y-1.5">
                    {complaints.map((c) => (
                      <div key={c.id} className="rounded border border-border/50 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs truncate">{c.description}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${c.priority === "High" ? "bg-red-500/10 text-red-400 border-red-500/20" : c.priority === "Medium" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>{c.priority}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${c.status === "Resolved" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>{c.status}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.date} · {c.reported_by}</p>
                        {c.resolution && <p className="text-[10px] text-green-400 mt-0.5">Resolution: {c.resolution}</p>}
                        {c.status !== "Resolved" && (
                          <button onClick={() => { const r = prompt("Resolution notes:"); if (r) resolveComplaint(c.id, r); }} className="text-[10px] text-primary hover:underline mt-1">Mark Resolved</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Assign / Reassign Modal */}
      {showAssign && selected && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowAssign(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl p-6 z-[70] shadow-2xl space-y-4">
            <div className="flex justify-between"><h3 className="text-sm font-semibold">{selected.status === "Assigned" ? "Reassign" : "Assign"} Device</h3><button onClick={() => setShowAssign(false)}><XIcon size={16} /></button></div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Employee *</label>
                {assignForm.name ? (
                  <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <span className="text-sm">{assignForm.name}{assignForm.empId ? ` (${assignForm.empId})` : ""}</span>
                    <button type="button" onClick={() => { setAssignForm({ name: "", empId: "" }); setEmpSearch(""); }} className="text-muted-foreground hover:text-foreground"><XIcon size={14} /></button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        placeholder="Search employee..."
                        autoFocus
                        className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                      />
                    </div>
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card">
                      {employees
                        .filter((emp) => {
                          if (!empSearch.trim()) return true;
                          const s = empSearch.toLowerCase();
                          return emp.first_name?.toLowerCase().includes(s) || emp.last_name?.toLowerCase().includes(s) || emp.employee_number?.toLowerCase().includes(s);
                        })
                        .map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setAssignForm({ name: `${emp.first_name} ${emp.last_name}`.trim(), empId: emp.employee_number || emp.id });
                              setEmpSearch("");
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0"
                          >
                            {emp.first_name} {emp.last_name}{emp.employee_number ? <span className="text-muted-foreground ml-1">({emp.employee_number})</span> : ""}
                          </button>
                        ))
                      }
                      {employees.filter((emp) => {
                        if (!empSearch.trim()) return true;
                        const s = empSearch.toLowerCase();
                        return emp.first_name?.toLowerCase().includes(s) || emp.last_name?.toLowerCase().includes(s) || emp.employee_number?.toLowerCase().includes(s);
                      }).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">No employees found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleAssign} disabled={saving} className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving..." : "Assign"}</button>
          </div>
        </>
      )}

      {/* File Complaint Modal */}
      {showComplaint && selected && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowComplaint(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl p-6 z-[70] shadow-2xl space-y-4">
            <div className="flex justify-between"><h3 className="text-sm font-semibold">File Complaint</h3><button onClick={() => setShowComplaint(false)}><XIcon size={16} /></button></div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Reported By</label><input value={complaintForm.reported_by} onChange={(e) => setComplaintForm((p) => ({ ...p, reported_by: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Issue Description *</label><textarea value={complaintForm.description} onChange={(e) => setComplaintForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Priority</label><select value={complaintForm.priority} onChange={(e) => setComplaintForm((p) => ({ ...p, priority: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">{COMPLAINT_PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></div>
            </div>
            <button onClick={handleComplaint} disabled={saving} className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Filing..." : "File Complaint"}</button>
          </div>
        </>
      )}
    </div>
  );
}

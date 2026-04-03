"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { STATUS_COLORS, COMPLAINT_PRIORITIES, COMPLAINT_STATUSES, isLaptop } from "@/lib/device-constants";
import QRCode from "qrcode";
import {
  MonitorIcon, UserIcon, CalendarIcon, AlertTriangleIcon,
  PrinterIcon, QrCodeIcon, ArrowLeftRightIcon, CornerDownLeftIcon,
  PlusIcon, XIcon, CheckCircleIcon, ClockIcon, ExternalLinkIcon, PencilIcon, SearchIcon,
} from "lucide-react";

export default function DeviceDetail({ params }) {
  const { id } = use(params);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [showComplaint, setShowComplaint] = useState(false);
  const [assignForm, setAssignForm] = useState({ name: "", empId: "" });
  const [empSearch, setEmpSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [complaintForm, setComplaintForm] = useState({ reported_by: "", description: "", priority: "Medium" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDevice();
    supabase.from("employees").select("id, employee_number, first_name, last_name").neq("employee_status", "inactive").order("first_name").then(({ data }) => {
      if (data) setEmployees(data);
    });
  }, [id]);

  async function regenerateQR(d, assignedName) {
    const qrPayload = {
      serial: d.serial_number, type: d.device_type, vendor: d.vendor,
      model: d.model_name, specs: d.specs || {},
      assigned_to: assignedName || null,
    };
    try { return await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 200 }); } catch { return d.qr_data; }
  }

  async function loadDevice() {
    const { data } = await supabase.from("devices").select("*").eq("id", id).single();
    if (data) setDevice(data);
    setLoading(false);
  }

  async function handleAssign() {
    if (!assignForm.name.trim() || !assignForm.empId.trim()) return;
    setSaving(true);
    const now = new Date().toISOString().split("T")[0];
    const history = [...(device.assignment_history || [])];
    if (device.assigned_employee_name) {
      history.push({
        employee_name: device.assigned_employee_name,
        employee_id: device.assigned_employee_id,
        assigned_date: device.assignment_date,
        returned_date: now,
      });
    }
    const qrData = await regenerateQR(device, assignForm.name.trim());
    await supabase.from("devices").update({
      assigned_employee_name: assignForm.name.trim(),
      assigned_employee_id: assignForm.empId.trim(),
      assignment_date: now,
      return_date: null,
      status: "Assigned",
      assignment_history: history,
      qr_data: qrData,
    }).eq("id", id);
    setShowAssign(false);
    setAssignForm({ name: "", empId: "" });
    setSaving(false);
    loadDevice();
  }

  async function handleReturn() {
    setSaving(true);
    const now = new Date().toISOString().split("T")[0];
    const history = [...(device.assignment_history || [])];
    history.push({
      employee_name: device.assigned_employee_name,
      employee_id: device.assigned_employee_id,
      assigned_date: device.assignment_date,
      returned_date: now,
    });
    const qrData = await regenerateQR(device, null);
    await supabase.from("devices").update({
      assigned_employee_name: null,
      assigned_employee_id: null,
      assignment_date: null,
      return_date: now,
      status: "Available",
      assignment_history: history,
      qr_data: qrData,
    }).eq("id", id);
    setSaving(false);
    loadDevice();
  }

  async function handleComplaint() {
    if (!complaintForm.description.trim()) return;
    setSaving(true);
    const complaints = [...(device.complaints || [])];
    complaints.push({
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      reported_by: complaintForm.reported_by.trim(),
      description: complaintForm.description.trim(),
      priority: complaintForm.priority,
      status: "Open",
      resolution: "",
    });
    await supabase.from("devices").update({ complaints, status: "In Repair" }).eq("id", id);
    setShowComplaint(false);
    setComplaintForm({ reported_by: "", description: "", priority: "Medium" });
    setSaving(false);
    loadDevice();
  }

  async function resolveComplaint(cId, resolution) {
    const complaints = (device.complaints || []).map((c) =>
      c.id === cId ? { ...c, status: "Resolved", resolution, resolved_date: new Date().toISOString().split("T")[0] } : c
    );
    const hasOpen = complaints.some((c) => c.status !== "Resolved");
    await supabase.from("devices").update({ complaints, status: hasOpen ? "In Repair" : "Available" }).eq("id", id);
    loadDevice();
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  if (!device) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Device not found.</div>;

  const specs = device.specs || {};
  const history = device.assignment_history || [];
  const complaints = device.complaints || [];
  const specSummary = isLaptop(device.device_type)
    ? [specs.proc_model, specs.ram_size, specs.storage_size, specs.os].filter(Boolean).join(" · ")
    : [specs.proc_model || specs.connection, specs.storage_size || specs.color, specs.os].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-mono mb-1">{device.device_id}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{device.model_name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{device.device_type} · {device.vendor} · SN: {device.serial_number}</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[device.status]}`}>{device.status}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <a href={`/devices/${id}/edit`} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors"><PencilIcon size={12} /> Edit</a>
        {device.status === "Available" && (
          <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md transition-colors"><UserIcon size={12} /> Assign</button>
        )}
        {device.status === "Assigned" && (
          <>
            <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md transition-colors"><ArrowLeftRightIcon size={12} /> Reassign</button>
            <button onClick={handleReturn} disabled={saving} className="flex items-center gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors"><CornerDownLeftIcon size={12} /> Return</button>
          </>
        )}
        <button onClick={() => setShowComplaint(true)} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors"><AlertTriangleIcon size={12} /> File Complaint</button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors"><PrinterIcon size={12} /> Print Label</button>
      </div>

      {/* Current Assignment */}
      {device.assigned_employee_name && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-xs text-muted-foreground mb-1">Currently Assigned To</p>
          <p className="text-sm font-medium">{device.assigned_employee_name} <span className="text-muted-foreground font-mono">({device.assigned_employee_id})</span></p>
          <p className="text-xs text-muted-foreground mt-1">Since {device.assignment_date}</p>
        </div>
      )}

      {/* QR Code & Label (print-friendly) */}
      <div className="rounded-xl border border-border bg-card p-5 print:border-black print:bg-white" id="device-label">
        <div className="flex gap-4">
          {device.qr_data && <img src={device.qr_data} alt="QR Code" className="w-32 h-32 rounded-lg" />}
          <div className="flex-1">
            <p className="font-bold text-lg">{device.device_id}</p>
            <p className="text-sm">{device.model_name}</p>
            <p className="text-xs text-muted-foreground">{device.device_type} · {device.vendor}</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">SN: {device.serial_number}</p>
            {specSummary && <p className="text-xs text-muted-foreground mt-1">{specSummary}</p>}
            {device.assigned_employee_name && <p className="text-xs mt-1">Assigned: {device.assigned_employee_name}</p>}
          </div>
        </div>
      </div>

      {/* Specs */}
      {Object.keys(specs).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-3">Specifications</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(specs).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border/50 p-2.5">
                <p className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                <p className="text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignment History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><ClockIcon size={14} className="text-muted-foreground" /> Assignment History</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="font-medium">{h.employee_name} <span className="text-muted-foreground font-mono text-xs">({h.employee_id})</span></p>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <p>{h.assigned_date} → {h.returned_date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complaints */}
      {complaints.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><AlertTriangleIcon size={14} className="text-muted-foreground" /> Complaints</h3>
          <div className="space-y-2">
            {complaints.map((c) => (
              <div key={c.id} className="rounded-lg border border-border/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm">{c.description}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.priority === "High" ? "bg-red-500/10 text-red-400 border-red-500/20" : c.priority === "Medium" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>{c.priority}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.status === "Resolved" ? "bg-green-500/10 text-green-400 border-green-500/20" : c.status === "In Progress" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>{c.status}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.date} · {c.reported_by}</p>
                {c.resolution && <p className="text-xs text-green-400 mt-1">Resolution: {c.resolution}</p>}
                {c.status !== "Resolved" && (
                  <button onClick={() => { const r = prompt("Resolution notes:"); if (r) resolveComplaint(c.id, r); }} className="text-[10px] text-primary hover:underline mt-1">Mark Resolved</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAssign(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl p-6 z-50 shadow-2xl space-y-4">
            <div className="flex justify-between"><h3 className="text-sm font-semibold">{device.status === "Assigned" ? "Reassign" : "Assign"} Device</h3><button onClick={() => setShowAssign(false)}><XIcon size={16} /></button></div>
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

      {/* Complaint Modal */}
      {showComplaint && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowComplaint(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl p-6 z-50 shadow-2xl space-y-4">
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

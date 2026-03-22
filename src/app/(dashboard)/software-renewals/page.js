"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarIcon,
  PlusIcon,
  XIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  SearchIcon,
  ListIcon,
  LayoutGridIcon,
  AlertTriangleIcon,
  BellIcon,
  CreditCardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  RefreshCwIcon,
} from "lucide-react";

const SUBSCRIPTION_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

const STATUS_COLORS = {
  upcoming: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const CALENDAR_DOT_COLORS = {
  upcoming: "bg-blue-400",
  overdue: "bg-red-400",
  completed: "bg-emerald-400",
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount || 0);
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getAutoStatus(dateStr, currentStatus) {
  if (currentStatus === "completed") return "completed";
  const days = daysUntil(dateStr);
  return days < 0 ? "overdue" : "upcoming";
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SoftwareRenewals() {
  const [user, setUser] = useState(null);
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("calendar");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    software_name: "", subscription_type: "yearly", renewal_date: "", cost: "", currency: "INR", vendor: "", notes: "", recurring: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const loadRenewals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("software_renewals")
      .select("*")
      .eq("user_id", user.id)
      .order("renewal_date", { ascending: true });

    if (data) {
      // Auto-update overdue status
      const updated = data.map((r) => ({ ...r, status: getAutoStatus(r.renewal_date, r.status) }));
      setRenewals(updated);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadRenewals(); }, [loadRenewals]);

  function openAdd(date) {
    setDrawerMode("add");
    setEditId(null);
    setForm({
      software_name: "", subscription_type: "yearly",
      renewal_date: date || new Date().toISOString().split("T")[0],
      cost: "", currency: "INR", vendor: "", notes: "", recurring: false,
    });
    setDrawerOpen(true);
    setError("");
  }

  function openEdit(renewal) {
    setDrawerMode("edit");
    setEditId(renewal.id);
    setForm({
      software_name: renewal.software_name,
      subscription_type: renewal.subscription_type,
      renewal_date: renewal.renewal_date,
      cost: renewal.cost || "",
      currency: renewal.currency || "INR",
      vendor: renewal.vendor || "",
      notes: renewal.notes || "",
      recurring: renewal.recurring || false,
    });
    setDrawerOpen(true);
    setError("");
  }

  async function handleSave() {
    if (!form.software_name.trim() || !form.renewal_date || !user) return;
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      cost: Number(form.cost) || 0,
      status: getAutoStatus(form.renewal_date, "upcoming"),
    };

    if (drawerMode === "add") {
      const { error: e } = await supabase.from("software_renewals").insert({ ...payload, user_id: user.id });
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase.from("software_renewals").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId);
      if (e) setError(e.message);
    }

    setSaving(false);
    if (!error) {
      setDrawerOpen(false);
      loadRenewals();
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this renewal?")) return;
    await supabase.from("software_renewals").delete().eq("id", id);
    loadRenewals();
  }

  async function toggleComplete(renewal) {
    const newStatus = renewal.status === "completed" ? getAutoStatus(renewal.renewal_date, "upcoming") : "completed";
    await supabase.from("software_renewals").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", renewal.id);
    loadRenewals();
  }

  function exportCSV() {
    const headers = ["Software", "Type", "Renewal Date", "Cost", "Currency", "Vendor", "Status", "Notes"];
    const rows = renewals.map((r) => [r.software_name, r.subscription_type, r.renewal_date, r.cost, r.currency, r.vendor, r.status, r.notes]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `software-renewals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filters
  const filtered = renewals.filter((r) => {
    if (search && !r.software_name.toLowerCase().includes(search.toLowerCase()) && !r.vendor?.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && r.subscription_type !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const upcomingCount = renewals.filter((r) => r.status === "upcoming" && daysUntil(r.renewal_date) <= 7 && daysUntil(r.renewal_date) >= 0).length;
  const overdueCount = renewals.filter((r) => r.status === "overdue").length;
  const totalMonthlyCost = renewals.filter((r) => r.status !== "completed").reduce((sum, r) => {
    if (r.subscription_type === "monthly") return sum + (r.cost || 0);
    if (r.subscription_type === "yearly") return sum + (r.cost || 0) / 12;
    return sum + (r.cost || 0) / 12;
  }, 0);

  // Calendar data
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  function getRenewalsForDay(day) {
    if (!day) return [];
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return renewals.filter((r) => r.renewal_date === dateStr);
  }

  const today = new Date();
  const isToday = (day) => day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarIcon size={24} className="text-primary" />
            Software Renewals
          </h1>
          <p className="text-muted-foreground mt-1">{renewals.length} subscriptions tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="rounded-md border border-border p-2 hover:bg-muted/50 transition-colors" title="Export CSV">
            <DownloadIcon size={14} />
          </button>
          <button onClick={() => openAdd()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
            <PlusIcon size={16} /> Add Renewal
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <BellIcon size={14} className="text-amber-400" />
            <span className="text-xs text-muted-foreground">Due in 7 days</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{upcomingCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangleIcon size={14} className="text-red-400" />
            <span className="text-xs text-muted-foreground">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCardIcon size={14} className="text-blue-400" />
            <span className="text-xs text-muted-foreground">Monthly Cost</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalMonthlyCost)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon size={14} className="text-emerald-400" />
            <span className="text-xs text-muted-foreground">Total Active</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{renewals.filter((r) => r.status !== "completed").length}</p>
        </div>
      </div>

      {/* Alerts */}
      {(upcomingCount > 0 || overdueCount > 0) && (
        <div className="space-y-2">
          {renewals.filter((r) => r.status === "overdue").map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              <AlertTriangleIcon size={14} />
              <span className="font-medium">{r.software_name}</span> is overdue ({Math.abs(daysUntil(r.renewal_date))} days ago)
            </div>
          ))}
          {renewals.filter((r) => r.status === "upcoming" && daysUntil(r.renewal_date) <= 7 && daysUntil(r.renewal_date) >= 0).map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
              <BellIcon size={14} />
              <span className="font-medium">{r.software_name}</span> renews in {daysUntil(r.renewal_date)} day{daysUntil(r.renewal_date) !== 1 ? "s" : ""}
            </div>
          ))}
        </div>
      )}

      {/* Search, Filter, View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by software or vendor..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none">
            <option value="all">All Types</option>
            {SUBSCRIPTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none">
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("calendar")} className={`p-2 transition-colors ${view === "calendar" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGridIcon size={16} />
            </button>
            <button onClick={() => setView("list")} className={`p-2 transition-colors ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="rounded-xl border border-border bg-card p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground">
              <ChevronLeftIcon size={18} />
            </button>
            <h2 className="text-sm font-semibold">{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground">
              <ChevronRightIcon size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const dayRenewals = getRenewalsForDay(day);
              const isSelected = selectedDate === `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (!day) return;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    setSelectedDate(isSelected ? null : dateStr);
                  }}
                  className={`min-h-[72px] rounded-lg p-1.5 text-xs transition-colors ${
                    day ? "cursor-pointer hover:bg-muted/30" : ""
                  } ${isToday(day) ? "ring-1 ring-primary/50 bg-primary/5" : ""} ${isSelected ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                >
                  {day && (
                    <>
                      <span className={`text-xs ${isToday(day) ? "text-primary font-bold" : "text-muted-foreground"}`}>{day}</span>
                      <div className="mt-1 space-y-0.5">
                        {dayRenewals.slice(0, 2).map((r) => (
                          <div key={r.id} className={`text-[9px] px-1 py-0.5 rounded truncate ${STATUS_COLORS[r.status]}`}>
                            {r.software_name}
                          </div>
                        ))}
                        {dayRenewals.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{dayRenewals.length - 2} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected date details */}
          {selectedDate && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h3>
                <button onClick={() => openAdd(selectedDate)} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <PlusIcon size={12} /> Add
                </button>
              </div>
              {getRenewalsForDay(Number(selectedDate.split("-")[2])).length === 0 ? (
                <p className="text-xs text-muted-foreground">No renewals on this date.</p>
              ) : (
                <div className="space-y-2">
                  {getRenewalsForDay(Number(selectedDate.split("-")[2])).map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{r.software_name}</p>
                        <p className="text-xs text-muted-foreground">{r.vendor} · {formatCurrency(r.cost, r.currency)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                        <button onClick={() => openEdit(r)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={12} /></button>
                        <button onClick={() => toggleComplete(r)} className="p-1 text-muted-foreground hover:text-emerald-400 rounded hover:bg-emerald-500/10" title={r.status === "completed" ? "Mark active" : "Mark completed"}><CheckIcon size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_100px_80px_60px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Software</span>
            <span>Renewal Date</span>
            <span>Cost</span>
            <span>Type</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No renewals found.</div>
          ) : (
            filtered.map((r, i) => {
              const days = daysUntil(r.renewal_date);
              return (
                <div key={r.id} className={`grid grid-cols-[1fr_100px_100px_100px_80px_60px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.software_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.vendor || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs">{r.renewal_date}</span>
                    {days >= 0 && days <= 7 && r.status !== "completed" && (
                      <p className="text-[10px] text-amber-400">{days}d left</p>
                    )}
                    {days < 0 && r.status !== "completed" && (
                      <p className="text-[10px] text-red-400">{Math.abs(days)}d overdue</p>
                    )}
                  </div>
                  <span className="text-xs font-medium">{formatCurrency(r.cost, r.currency)}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/50 w-fit">{r.subscription_type}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(r)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={12} /></button>
                    <button onClick={() => toggleComplete(r)} className="p-1 text-muted-foreground hover:text-emerald-400 rounded hover:bg-emerald-500/10"><CheckIcon size={12} /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10"><TrashIcon size={12} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add/Edit Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">{drawerMode === "add" ? "Add Renewal" : "Edit Renewal"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</div>}

              <div>
                <label className="text-xs font-medium mb-1.5 block">Software Name *</label>
                <input type="text" value={form.software_name} onChange={(e) => setForm({ ...form, software_name: e.target.value })} placeholder="e.g. Figma, AWS, Slack" autoFocus className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Cost</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Vendor / Provider</label>
                <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Adobe, Google, Microsoft" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Subscription Type</label>
                  <select value={form.subscription_type} onChange={(e) => setForm({ ...form, subscription_type: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    {SUBSCRIPTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Renewal Date *</label>
                  <input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="rounded border-border" />
                <span className="text-sm">Auto-recurring renewal</span>
              </label>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={handleSave} disabled={!form.software_name.trim() || !form.renewal_date || saving} className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? "Saving..." : drawerMode === "add" ? "Add Renewal" : "Save Changes"}
              </button>
              <button onClick={() => setDrawerOpen(false)} className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

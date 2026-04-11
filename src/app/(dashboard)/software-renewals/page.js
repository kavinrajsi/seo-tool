"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  PlusIcon,
  XIcon,
  SearchIcon,
  ListIcon,
  LayoutGridIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  TrendingDownIcon,
} from "lucide-react";

const PAYMENT_METHODS = ["Card", "Bank Transfer", "UPI", "Cash", "Other"];

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key) {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SoftwareRenewals() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [view, setView] = useState("list");
  const [dateRange, setDateRange] = useState("30");

  // Calendar
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    software_name: "", cost: "", currency: "USD", vendor: "", payment_method: "Card",
    renewal_date: new Date().toISOString().split("T")[0], subscription_type: "monthly", notes: "", recurring: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Context menu
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("software_renewals")
      .select("*")
      .eq("user_id", user.id)
      .order("renewal_date", { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  // Date range filtering
  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(dateRange));
    return d.toISOString().split("T")[0];
  }, [dateRange]);

  const inRange = useMemo(() => expenses.filter((e) => e.renewal_date >= rangeStart), [expenses, rangeStart]);

  // Categories from data
  const categories = useMemo(() => [...new Set(expenses.map((e) => e.vendor).filter(Boolean))].sort(), [expenses]);

  // Stats
  const totalAmount = useMemo(() => inRange.reduce((s, e) => s + (e.cost || 0), 0), [inRange]);
  const avgDaily = useMemo(() => totalAmount / Number(dateRange), [totalAmount, dateRange]);
  const activeCategories = useMemo(() => new Set(inRange.map((e) => e.vendor).filter(Boolean)).size, [inRange]);

  // Timeline chart data (last N days)
  const chartData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = Number(dateRange) - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayTotal = inRange.filter((e) => e.renewal_date === key).reduce((s, e) => s + (e.cost || 0), 0);
      days.push({ date: key, total: dayTotal, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
    }
    return days;
  }, [inRange, dateRange]);

  const maxChart = useMemo(() => Math.max(...chartData.map((d) => d.total), 1), [chartData]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...expenses];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((e) => e.software_name?.toLowerCase().includes(s) || e.vendor?.toLowerCase().includes(s));
    }
    if (categoryFilter !== "all") list = list.filter((e) => e.vendor === categoryFilter);
    list.sort((a, b) => sortOrder === "newest"
      ? new Date(b.renewal_date) - new Date(a.renewal_date)
      : new Date(a.renewal_date) - new Date(b.renewal_date)
    );
    return list;
  }, [expenses, search, categoryFilter, sortOrder]);

  // Group by month
  const grouped = useMemo(() => {
    const map = {};
    for (const e of filtered) {
      const key = getMonthKey(e.renewal_date);
      if (!map[key]) map[key] = { items: [], total: 0 };
      map[key].items.push(e);
      map[key].total += e.cost || 0;
    }
    return Object.entries(map).sort(([a], [b]) => sortOrder === "newest" ? b.localeCompare(a) : a.localeCompare(b));
  }, [filtered, sortOrder]);

  function openAdd() {
    setDrawerMode("add");
    setEditId(null);
    setForm({ software_name: "", cost: "", currency: "USD", vendor: "", payment_method: "Card", renewal_date: new Date().toISOString().split("T")[0], subscription_type: "monthly", notes: "", recurring: false });
    setDrawerOpen(true);
    setError("");
  }

  function openEdit(e) {
    setDrawerMode("edit");
    setEditId(e.id);
    setForm({
      software_name: e.software_name, cost: e.cost || "", currency: e.currency || "USD", vendor: e.vendor || "",
      payment_method: e.payment_method || "Card", renewal_date: e.renewal_date, subscription_type: e.subscription_type || "monthly",
      notes: e.notes || "", recurring: e.recurring || false,
    });
    setDrawerOpen(true);
    setMenuOpen(null);
    setError("");
  }

  async function handleSave() {
    if (!form.software_name.trim() || !form.renewal_date || !user) return;
    setSaving(true);
    setError("");
    const payload = { ...form, cost: Number(form.cost) || 0 };

    if (drawerMode === "add") {
      const { error: e } = await supabase.from("software_renewals").insert({ ...payload, user_id: user.id, status: "upcoming" });
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase.from("software_renewals").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId);
      if (e) setError(e.message);
    }
    setSaving(false);
    if (!error) { setDrawerOpen(false); loadExpenses(); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("software_renewals").delete().eq("id", id);
    setMenuOpen(null);
    loadExpenses();
  }

  const [hoveredBar, setHoveredBar] = useState(null);
  const chartRef = useRef(null);

  function scrollChart(dir) {
    if (!chartRef.current) return;
    chartRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
  }

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-card px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last 365 Days</option>
            </select>
            <ChevronDownIcon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <button className="rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors">
            <SettingsIcon size={16} className="text-muted-foreground" />
          </button>
          <button onClick={openAdd} className="rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/90 flex items-center gap-2 transition-colors">
            <PlusIcon size={16} /> Add
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Total</span>
            {inRange.length > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex items-center gap-0.5">
                <TrendingDownIcon size={9} /> 100%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{inRange.length} expenses</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Avg. Daily</span>
            {inRange.length > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex items-center gap-0.5">
                <TrendingDownIcon size={9} /> 100%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold">{formatCurrency(avgDaily)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">per day</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Count</span>
            {inRange.length > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex items-center gap-0.5">
                <TrendingDownIcon size={9} /> 100%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold">{inRange.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">expenses</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Categories</span>
          </div>
          <p className="text-2xl font-bold">{activeCategories}</p>
          <p className="text-xs text-muted-foreground mt-0.5">active</p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="relative group/chart">
        {/* Left arrow */}
        <button
          onClick={() => scrollChart(-1)}
          className="absolute left-0 top-0 bottom-6 z-10 w-8 flex items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 group-hover/chart:opacity-100 transition-opacity"
        >
          <ChevronLeftIcon size={18} className="text-muted-foreground" />
        </button>
        {/* Right arrow */}
        <button
          onClick={() => scrollChart(1)}
          className="absolute right-0 top-0 bottom-6 z-10 w-8 flex items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 group-hover/chart:opacity-100 transition-opacity"
        >
          <ChevronRightIcon size={18} className="text-muted-foreground" />
        </button>

        <div
          ref={chartRef}
          className="flex gap-[3px] h-[160px] overflow-x-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--primary)) transparent" }}
        >
          {chartData.map((day, i) => (
            <div
              key={day.date}
              className="flex flex-col items-center min-w-[28px] h-full"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Bar area — takes remaining space, aligns bar to bottom */}
              <div className="flex-1 w-full flex justify-center items-end relative">
                {/* Tooltip */}
                {hoveredBar === i && (
                  <div className="absolute bottom-full mb-2 z-10 rounded-lg bg-card border border-border px-3 py-2 shadow-lg text-xs whitespace-nowrap pointer-events-none">
                    <p className="font-medium">{formatDate(day.date)}</p>
                    <p className="text-muted-foreground">Expenses: {formatCurrency(day.total)}</p>
                  </div>
                )}
                <div
                  className={`rounded-full transition-all ${hoveredBar === i ? "w-3" : "w-2"}`}
                  style={{
                    height: day.total > 0 ? `${Math.max((day.total / maxChart) * 100, 12)}%` : "4px",
                    backgroundColor: day.total > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)",
                  }}
                />
              </div>
              {/* Date label */}
              <span className="text-[9px] text-muted-foreground mt-1.5 whitespace-nowrap">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="appearance-none rounded-lg border border-border bg-card px-3 py-2 pr-8 text-sm cursor-pointer focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <ChevronDownIcon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none rounded-lg border border-border bg-card px-3 py-2 pr-8 text-sm cursor-pointer focus:outline-none"
          >
            <option value="all">All</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDownIcon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView("list")} className={`p-2 transition-colors ${view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} title="List">
            <ListIcon size={15} />
          </button>
          <button onClick={() => setView("grid")} className={`p-2 transition-colors ${view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Grid">
            <LayoutGridIcon size={15} />
          </button>
          <button onClick={() => setView("calendar")} className={`p-2 transition-colors ${view === "calendar" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Calendar">
            <CalendarIcon size={15} />
          </button>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground">
              <ChevronLeftIcon size={18} />
            </button>
            <h2 className="text-sm font-semibold">{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground">
              <ChevronRightIcon size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const firstDay = new Date(calYear, calMonth, 1).getDay();
              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
              const today = new Date();
              const cells = [];
              for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayExpenses = expenses.filter((e) => e.renewal_date === dateStr);
                const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                const dayTotal = dayExpenses.reduce((s, e) => s + (e.cost || 0), 0);
                cells.push(
                  <div key={day} className={`min-h-[72px] rounded-lg p-1.5 text-xs transition-colors cursor-pointer hover:bg-muted/30 ${isToday ? "ring-1 ring-primary/50 bg-primary/5" : ""}`}>
                    <span className={`text-xs ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {dayExpenses.slice(0, 2).map((e) => (
                        <div key={e.id} className="text-[9px] px-1 py-0.5 rounded truncate bg-primary/10 text-primary border border-primary/20">
                          {e.software_name}
                        </div>
                      ))}
                      {dayExpenses.length > 2 && <span className="text-[9px] text-muted-foreground">+{dayExpenses.length - 2} more</span>}
                      {dayTotal > 0 && dayExpenses.length <= 2 && (
                        <p className="text-[9px] font-medium text-muted-foreground">{formatCurrency(dayTotal)}</p>
                      )}
                    </div>
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Expense List (grouped by month) */}
      {view !== "calendar" && filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No expenses found</p>
          <p className="text-xs mt-1">Click "Add" to track your first expense</p>
        </div>
      ) : view !== "calendar" && (
        <div className="space-y-6">
          {grouped.map(([monthKey, { items, total }]) => (
            <div key={monthKey}>
              {/* Month header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{getMonthLabel(monthKey)}</h3>
                <span className="text-sm font-medium">{formatCurrency(total)}</span>
              </div>

              {view === "list" ? (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {items.map((expense, i) => (
                    <div
                      key={expense.id}
                      className={`flex items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors ${i < items.length - 1 ? "border-b border-border/50" : ""}`}
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground uppercase">
                        {expense.software_name?.charAt(0) || "?"}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{expense.software_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {expense.vendor || "Uncategorized"}
                          {expense.payment_method && <> · {expense.payment_method}</>}
                        </p>
                      </div>
                      {/* Amount + Date */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">-{formatCurrency(expense.cost, expense.currency)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(expense.renewal_date)}</p>
                      </div>
                      {/* Menu */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setMenuOpen(menuOpen === expense.id ? null : expense.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <MoreHorizontalIcon size={16} />
                        </button>
                        {menuOpen === expense.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-lg py-1 min-w-[120px]">
                              <button onClick={() => openEdit(expense)} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                                <PencilIcon size={12} /> Edit
                              </button>
                              <button onClick={() => handleDelete(expense.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                                <TrashIcon size={12} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((expense) => (
                    <div key={expense.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-sm font-bold text-muted-foreground uppercase">
                          {expense.software_name?.charAt(0) || "?"}
                        </div>
                        <button onClick={() => setMenuOpen(menuOpen === expense.id ? null : expense.id)} className="p-1 text-muted-foreground hover:text-foreground">
                          <MoreHorizontalIcon size={14} />
                        </button>
                      </div>
                      <p className="text-sm font-medium truncate">{expense.software_name}</p>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {expense.vendor || "Uncategorized"}{expense.payment_method && ` · ${expense.payment_method}`}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">-{formatCurrency(expense.cost, expense.currency)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(expense.renewal_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">{drawerMode === "add" ? "Add Expense" : "Edit Expense"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</div>}

              <div>
                <label className="text-xs font-medium mb-1.5 block">Name *</label>
                <input type="text" value={form.software_name} onChange={(e) => setForm({ ...form, software_name: e.target.value })} placeholder="e.g. Figma, AWS, Slack" autoFocus className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Amount</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Category / Vendor</label>
                  <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. figma, google" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Payment Method</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Date *</label>
                  <input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Billing Cycle</label>
                  <select value={form.subscription_type} onChange={(e) => setForm({ ...form, subscription_type: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="rounded border-border" />
                <span className="text-sm">Recurring expense</span>
              </label>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={handleSave} disabled={!form.software_name.trim() || !form.renewal_date || saving} className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? "Saving..." : drawerMode === "add" ? "Add Expense" : "Save Changes"}
              </button>
              <button onClick={() => setDrawerOpen(false)} className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

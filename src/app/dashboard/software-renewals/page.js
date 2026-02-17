"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_OPTIONS = ["SaaS", "Hosting", "Domain", "Security", "Analytics", "Design", "Marketing", "Communication", "Storage", "Development", "Other"];

function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function getDaysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function getNextOccurrence(renewalDate, billingCycle, year, month) {
  const dates = [];
  const base = new Date(renewalDate + "T00:00:00");
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  let increment;
  if (billingCycle === "monthly") increment = 1;
  else if (billingCycle === "quarterly") increment = 3;
  else increment = 12;

  // Generate occurrences around this month
  const cur = new Date(base);
  // Go back enough to find occurrences before this month
  while (cur > monthStart) {
    cur.setMonth(cur.getMonth() - increment);
  }
  // Now go forward
  while (cur <= monthEnd) {
    if (cur >= monthStart && cur <= monthEnd) {
      dates.push(toDateKey(cur));
    }
    cur.setMonth(cur.getMonth() + increment);
    if (cur > monthEnd && dates.length === 0) {
      // Check one more
      break;
    }
  }
  return dates;
}

const DEFAULT_FORM = {
  name: "",
  vendor: "",
  url: "",
  category: "",
  renewal_date: "",
  billing_cycle: "monthly",
  cost: "",
  payment_method: "",
  status: "active",
  license_count: 1,
  alert_days_before: 7,
  notes: "",
};

export default function SoftwareRenewalsPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [renewals, setRenewals] = useState([]);
  const [stats, setStats] = useState({ totalActive: 0, monthlyCost: 0, annualCost: 0, upcomingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
  const [showModal, setShowModal] = useState(false);
  const [editingRenewal, setEditingRenewal] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Bulk import
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await projectFetch("/api/software-renewals");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRenewals(data.renewals || []);
      setStats(data.stats || { totalActive: 0, monthlyCost: 0, annualCost: 0, upcomingCount: 0 });
    } catch {
      setError("Failed to load software renewals");
    }
    setLoading(false);
  }, [projectFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered renewals
  const filteredRenewals = useMemo(() => {
    return renewals.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          (r.vendor && r.vendor.toLowerCase().includes(q)) ||
          (r.category && r.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [renewals, statusFilter, categoryFilter, search]);

  // Renewals by date for calendar view (projected recurring dates for current month)
  const renewalsByDate = useMemo(() => {
    const map = {};
    for (const r of filteredRenewals) {
      const occurrences = getNextOccurrence(r.renewal_date, r.billing_cycle, year, month);
      for (const dateKey of occurrences) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(r);
      }
    }
    return map;
  }, [filteredRenewals, year, month]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const days = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), outside: true });
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), outside: false });
    }
    while (days.length < 42) {
      const d = new Date(year, month + 1, days.length - startOffset - daysInMonth + 1);
      days.push({ date: d, outside: true });
    }
    return days;
  }, [year, month]);

  // List view data
  const listViewData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = toDateKey(date);
      const dayRenewals = renewalsByDate[key] || [];
      if (dayRenewals.length > 0) {
        items.push({ date, dateKey: key, renewals: dayRenewals });
      }
    }
    return items;
  }, [year, month, renewalsByDate]);

  const today = toDateKey(new Date());
  const monthName = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Categories present in data
  const availableCategories = useMemo(() => {
    const cats = new Set();
    renewals.forEach((r) => { if (r.category) cats.add(r.category); });
    return Array.from(cats).sort();
  }, [renewals]);

  // Navigation
  function goToPrevMonth() { setCurrentDate(new Date(year, month - 1, 1)); }
  function goToNextMonth() { setCurrentDate(new Date(year, month + 1, 1)); }
  function goToToday() { setCurrentDate(new Date()); }

  function selectDay(dateKey) {
    setSelectedDate(dateKey === selectedDate ? null : dateKey);
  }

  // Modal
  function openAddModal() {
    setEditingRenewal(null);
    setForm({ ...DEFAULT_FORM, renewal_date: toDateKey(new Date()) });
    setShowModal(true);
  }

  function openEditModal(renewal) {
    setEditingRenewal(renewal);
    setForm({
      name: renewal.name || "",
      vendor: renewal.vendor || "",
      url: renewal.url || "",
      category: renewal.category || "",
      renewal_date: renewal.renewal_date || "",
      billing_cycle: renewal.billing_cycle || "monthly",
      cost: renewal.cost || "",
      payment_method: renewal.payment_method || "",
      status: renewal.status || "active",
      license_count: renewal.license_count || 1,
      alert_days_before: renewal.alert_days_before !== null ? renewal.alert_days_before : 7,
      notes: renewal.notes || "",
    });
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.renewal_date || !form.cost) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        vendor: form.vendor.trim() || null,
        url: form.url.trim() || null,
        category: form.category || null,
        renewal_date: form.renewal_date,
        billing_cycle: form.billing_cycle,
        cost: parseFloat(form.cost),
        payment_method: form.payment_method.trim() || null,
        status: form.status,
        license_count: parseInt(form.license_count) || 1,
        alert_days_before: parseInt(form.alert_days_before) || 7,
        notes: form.notes.trim() || null,
      };

      if (!editingRenewal) {
        payload.project_id = activeProjectId || null;
      }

      if (editingRenewal) {
        const res = await fetch(`/api/software-renewals/${editingRenewal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const { renewal } = await res.json();
          setRenewals((prev) => prev.map((r) => (r.id === renewal.id ? renewal : r)));
        }
      } else {
        const res = await fetch("/api/software-renewals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await fetchData();
        }
      }
    } catch {
      setError("Failed to save renewal");
    }
    setSubmitting(false);
    setShowModal(false);
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/software-renewals/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRenewals((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      setError("Failed to delete renewal");
    }
  }

  // Bulk import helpers
  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { result.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headerLine = parseCSVLine(lines[0]);
    const headers = headerLine.map((h) => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && !values[0])) continue;
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] || ""; });
      rows.push(obj);
    }
    return rows;
  }

  function handleBulkFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => { setBulkCsvText(ev.target.result || ""); };
    reader.readAsText(file);
  }

  function openBulkModal() {
    setBulkCsvText("");
    setBulkFile(null);
    setBulkResult(null);
    setBulkError("");
    setShowBulkModal(true);
  }

  function closeBulkModal() {
    setShowBulkModal(false);
    setBulkResult(null);
    setBulkError("");
  }

  async function handleBulkImport() {
    setBulkError("");
    setBulkResult(null);

    if (!bulkCsvText.trim()) {
      setBulkError("Please paste CSV data or upload a CSV file");
      return;
    }

    const parsed = parseCSV(bulkCsvText);
    if (parsed.length === 0) {
      setBulkError("No valid rows found. Make sure your CSV has a header row and at least one data row.");
      return;
    }

    setBulkImporting(true);
    try {
      const payload = { renewals: parsed, project_id: activeProjectId || null };
      const res = await fetch("/api/software-renewals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkResult(data);
        if (data.imported > 0) {
          fetchData();
        }
      } else {
        setBulkError(data.error || "Import failed");
      }
    } catch {
      setBulkError("Network error");
    }
    setBulkImporting(false);
  }

  async function downloadBulkTemplate() {
    try {
      const res = await fetch("/api/software-renewals/bulk");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "software_renewals_template.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
  }

  // Skeleton loader
  if (loading) {
    const s = {
      background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      borderRadius: "8px",
    };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("200px", "28px", "0.5rem")} />
        <div style={b("350px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.statCard}>
              <div style={b("60%", "12px", "0.5rem")} />
              <div style={b("40%", "28px")} />
            </div>
          ))}
        </div>
        <div className={styles.cardsGrid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.renewalCard}>
              <div style={b("70%", "18px", "0.75rem")} />
              <div style={b("50%", "12px", "0.5rem")} />
              <div style={b("40%", "24px", "0.5rem")} />
              <div style={b("60%", "12px")} />
            </div>
          ))}
        </div>
      </>
    );
  }

  // Selected day data for drawer
  const selectedDayRenewals = selectedDate ? (renewalsByDate[selectedDate] || []) : [];
  const selectedDateFormatted = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <>
      <h1 className={styles.heading}>Software Renewals</h1>
      <p className={styles.subheading}>Track your software subscriptions, renewal dates, costs, and alerts.</p>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Total Active</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueAccent}`}>{stats.totalActive}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Monthly Cost</div>
            <div className={styles.statIcon}>₹</div>
          </div>
          <div className={`${styles.statValue} ${styles.statValueBlue}`}>{formatCurrency(stats.monthlyCost)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Annual Cost</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValuePurple}`}>{formatCurrency(stats.annualCost)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Upcoming (30d)</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueAmber}`}>{stats.upcomingCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search renewals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <select className={styles.filterSelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="button" className={styles.bulkImportBtn} onClick={openBulkModal}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          Bulk Import
        </button>
        <button type="button" className={styles.addBtn} onClick={openAddModal}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Renewal
        </button>
      </div>

      {/* View Toggle + Month Nav */}
      <div className={styles.calendarHeader}>
        <h2 className={styles.monthTitle}>{monthName}</h2>
        <div className={styles.navButtons}>
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === "calendar" ? styles.viewToggleBtnActive : ""}`}
              onClick={() => setViewMode("calendar")}
              title="Calendar view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === "list" ? styles.viewToggleBtnActive : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === "cards" ? styles.viewToggleBtnActive : ""}`}
              onClick={() => setViewMode("cards")}
              title="Cards view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
          <button type="button" className={styles.navBtn} onClick={goToPrevMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" className={styles.todayBtn} onClick={goToToday}>Today</button>
          <button type="button" className={styles.navBtn} onClick={goToNextMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className={styles.calendarContainer}>
          <div className={styles.dayHeaders}>
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className={styles.dayHeader}>{d}</div>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {calendarDays.map((day, idx) => {
              const key = toDateKey(day.date);
              const isToday = key === today;
              const isSelected = key === selectedDate;
              const dayRenewals = renewalsByDate[key] || [];

              let cellClass = styles.dayCell;
              if (day.outside) cellClass += ` ${styles.dayCellOutside}`;
              if (isToday) cellClass += ` ${styles.dayCellToday}`;
              if (isSelected) cellClass += ` ${styles.dayCellSelected}`;

              return (
                <div key={idx} className={cellClass} onClick={() => selectDay(key)}>
                  <div className={styles.dayNumber}>
                    {isToday ? (
                      <span className={styles.dayNumberToday}>{day.date.getDate()}</span>
                    ) : (
                      day.date.getDate()
                    )}
                  </div>
                  {dayRenewals.length > 0 && (
                    <>
                      <div className={styles.dots}>
                        {dayRenewals.map((r) => {
                          const isAlert = r.status === "active" && r.alert_days_before && getDaysUntil(key) <= r.alert_days_before && getDaysUntil(key) >= 0;
                          let dotClass = styles.dot;
                          if (isAlert) dotClass += ` ${styles.dotAlert}`;
                          else if (r.status === "active") dotClass += ` ${styles.dotActive}`;
                          else if (r.status === "cancelled") dotClass += ` ${styles.dotCancelled}`;
                          else dotClass += ` ${styles.dotExpired}`;
                          return <span key={r.id} className={dotClass} />;
                        })}
                      </div>
                      <div className={styles.badges}>
                        {dayRenewals.slice(0, 2).map((r) => {
                          const isAlert = r.status === "active" && r.alert_days_before && getDaysUntil(key) <= r.alert_days_before && getDaysUntil(key) >= 0;
                          let badgeClass = styles.badge;
                          if (isAlert) badgeClass += ` ${styles.badgeAlert}`;
                          else if (r.status === "active") badgeClass += ` ${styles.badgeActive}`;
                          else if (r.status === "cancelled") badgeClass += ` ${styles.badgeCancelled}`;
                          else badgeClass += ` ${styles.badgeExpired}`;
                          return (
                            <span key={r.id} className={badgeClass}>{r.name}</span>
                          );
                        })}
                        {dayRenewals.length > 2 && (
                          <span className={styles.badge}>+{dayRenewals.length - 2} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className={styles.listContainer}>
          {listViewData.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <h3 className={styles.emptyTitle}>No renewals this month</h3>
              <p className={styles.emptyText}>No software renewals are due in {monthName}.</p>
            </div>
          ) : (
            listViewData.map((item) => {
              const dateFormatted = item.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              const isToday = item.dateKey === today;
              return (
                <div key={item.dateKey} className={`${styles.listDay} ${isToday ? styles.listDayToday : ""}`}>
                  <div className={styles.listDayHeader}>
                    <span className={styles.listDayDate}>{dateFormatted}</span>
                    {isToday && <span className={styles.listDayTodayBadge}>Today</span>}
                  </div>
                  {item.renewals.map((r) => (
                    <div key={r.id} className={styles.listItem}>
                      <span className={`${styles.statusBadge} ${r.status === "active" ? styles.statusActive : r.status === "cancelled" ? styles.statusCancelled : styles.statusExpired}`}>
                        {r.status}
                      </span>
                      <span className={styles.listItemName}>{r.name}</span>
                      {r.vendor && <span className={styles.listItemVendor}>{r.vendor}</span>}
                      <span className={styles.listItemCost}>{formatCurrency(r.cost)}</span>
                      <span className={`${styles.cycleBadge} ${r.billing_cycle === "monthly" ? styles.cycleMonthly : r.billing_cycle === "quarterly" ? styles.cycleQuarterly : styles.cycleYearly}`}>
                        {r.billing_cycle}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Cards View */}
      {viewMode === "cards" && (
        <>
          {filteredRenewals.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              <h3 className={styles.emptyTitle}>No software renewals</h3>
              <p className={styles.emptyText}>Add your first software subscription to start tracking.</p>
              <button type="button" className={styles.addBtn} onClick={openAddModal}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add Renewal
              </button>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {filteredRenewals.map((r) => {
                const daysUntil = getDaysUntil(r.renewal_date);
                const isAlert = r.status === "active" && r.alert_days_before && daysUntil <= r.alert_days_before && daysUntil >= 0;
                const isOverdue = r.status === "active" && daysUntil < 0;

                let cardClass = styles.renewalCard;
                if (isAlert) cardClass += ` ${styles.renewalCardAlert}`;
                else if (r.status === "active") cardClass += ` ${styles.renewalCardActive}`;
                else if (r.status === "cancelled") cardClass += ` ${styles.renewalCardCancelled}`;
                else cardClass += ` ${styles.renewalCardExpired}`;

                let countdownText;
                let countdownClass = styles.cardCountdown;
                if (daysUntil === 0) {
                  countdownText = "Due today";
                  countdownClass += ` ${styles.cardCountdownSoon}`;
                } else if (daysUntil === 1) {
                  countdownText = "Due tomorrow";
                  countdownClass += ` ${styles.cardCountdownSoon}`;
                } else if (daysUntil > 0 && daysUntil <= 7) {
                  countdownText = `Due in ${daysUntil} days`;
                  countdownClass += ` ${styles.cardCountdownSoon}`;
                } else if (daysUntil > 7) {
                  countdownText = `Due in ${daysUntil} days`;
                } else {
                  countdownText = `Overdue by ${Math.abs(daysUntil)} days`;
                  countdownClass += ` ${styles.cardCountdownOverdue}`;
                }

                return (
                  <div key={r.id} className={cardClass}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardName}>{r.name}</h3>
                        {r.vendor && <div className={styles.cardVendor}>{r.vendor}</div>}
                      </div>
                      <span className={`${styles.statusBadge} ${r.status === "active" ? styles.statusActive : r.status === "cancelled" ? styles.statusCancelled : styles.statusExpired}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardRow}>
                        <span className={styles.cardCost}>{formatCurrency(r.cost)}</span>
                        <span className={`${styles.cycleBadge} ${r.billing_cycle === "monthly" ? styles.cycleMonthly : r.billing_cycle === "quarterly" ? styles.cycleQuarterly : styles.cycleYearly}`}>
                          {r.billing_cycle}
                        </span>
                      </div>
                      <div className={styles.cardRow}>
                        <span className={styles.cardLabel}>Renewal</span>
                        <span className={styles.cardValue}>
                          {new Date(r.renewal_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      {r.status === "active" && (
                        <div className={countdownClass}>{countdownText}</div>
                      )}
                      {r.license_count > 1 && (
                        <div className={styles.cardRow}>
                          <span className={styles.cardLabel}>Licenses</span>
                          <span className={styles.cardValue}>{r.license_count}</span>
                        </div>
                      )}
                      {r.category && (
                        <div className={styles.cardRow}>
                          <span className={styles.cardLabel}>Category</span>
                          <span className={styles.categoryBadge}>{r.category}</span>
                        </div>
                      )}
                      {r.payment_method && (
                        <div className={styles.cardRow}>
                          <span className={styles.cardLabel}>Payment</span>
                          <span className={styles.cardValue}>{r.payment_method}</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.cardFooter}>
                      {isAlert && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                      )}
                      {!isAlert && <span />}
                      <div className={styles.cardActions}>
                        <button type="button" className={styles.cardActionBtn} onClick={() => openEditModal(r)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                        </button>
                        <button type="button" className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`} onClick={() => handleDelete(r.id)} title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Day Detail Drawer */}
      {selectedDate && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setSelectedDate(null)} />
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h3 className={styles.detailTitle}>{selectedDateFormatted}</h3>
              <button type="button" className={styles.detailClose} onClick={() => setSelectedDate(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.detailBody}>
              {selectedDayRenewals.length === 0 ? (
                <div className={styles.emptyDetail}>No renewals due on this day.</div>
              ) : (
                selectedDayRenewals.map((r) => (
                  <div key={r.id} className={styles.detailItem}>
                    <div className={styles.detailItemName}>{r.name}</div>
                    {r.vendor && <div className={styles.detailItemVendor}>{r.vendor}</div>}
                    <div className={styles.detailItemRow}>
                      <span className={styles.cardLabel}>Cost</span>
                      <span className={styles.cardCost}>{formatCurrency(r.cost)}</span>
                    </div>
                    <div className={styles.detailItemRow}>
                      <span className={styles.cardLabel}>Cycle</span>
                      <span className={`${styles.cycleBadge} ${r.billing_cycle === "monthly" ? styles.cycleMonthly : r.billing_cycle === "quarterly" ? styles.cycleQuarterly : styles.cycleYearly}`}>
                        {r.billing_cycle}
                      </span>
                    </div>
                    <div className={styles.detailItemRow}>
                      <span className={styles.cardLabel}>Status</span>
                      <span className={`${styles.statusBadge} ${r.status === "active" ? styles.statusActive : r.status === "cancelled" ? styles.statusCancelled : styles.statusExpired}`}>
                        {r.status}
                      </span>
                    </div>
                    {r.license_count > 1 && (
                      <div className={styles.detailItemRow}>
                        <span className={styles.cardLabel}>Licenses</span>
                        <span className={styles.cardValue}>{r.license_count}</span>
                      </div>
                    )}
                    {r.notes && (
                      <div className={styles.detailItemRow}>
                        <span className={styles.cardLabel}>Notes</span>
                        <span className={styles.cardValue}>{r.notes}</span>
                      </div>
                    )}
                    <div className={styles.detailItemActions}>
                      <button type="button" className={styles.detailActionBtn} onClick={() => openEditModal(r)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                        Edit
                      </button>
                      <button type="button" className={`${styles.detailActionBtn} ${styles.detailActionBtnDanger}`} onClick={() => handleDelete(r.id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeBulkModal(); }}>
          <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Bulk Import Renewals</h3>
              <button type="button" className={styles.modalClose} onClick={closeBulkModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {bulkError && <div className={styles.error}>{bulkError}</div>}

              {bulkResult ? (
                <div className={styles.bulkResult}>
                  <div className={styles.bulkResultStats}>
                    <div className={styles.bulkResultStat}>
                      <span className={styles.bulkResultLabel}>Total Rows</span>
                      <span className={styles.bulkResultValue}>{bulkResult.total}</span>
                    </div>
                    <div className={styles.bulkResultStat}>
                      <span className={styles.bulkResultLabel}>Imported</span>
                      <span className={`${styles.bulkResultValue} ${styles.bulkResultValueAccent}`}>{bulkResult.imported}</span>
                    </div>
                    <div className={styles.bulkResultStat}>
                      <span className={styles.bulkResultLabel}>Skipped</span>
                      <span className={styles.bulkResultValue} style={{ color: bulkResult.skipped > 0 ? "#ff4444" : undefined }}>
                        {bulkResult.skipped}
                      </span>
                    </div>
                  </div>

                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div className={styles.bulkErrors}>
                      <div className={styles.bulkErrorsTitle}>Errors ({bulkResult.errors.length})</div>
                      <div className={styles.bulkErrorsList}>
                        {bulkResult.errors.map((err, i) => (
                          <div key={i} className={styles.bulkErrorRow}>
                            <span className={styles.bulkErrorRowNum}>Row {err.row}</span>
                            <span>{err.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className={styles.bulkDesc}>
                    Upload a CSV file or paste CSV data below. The first row must be a header row with column names.
                  </p>

                  <div className={styles.bulkActions}>
                    <button type="button" className={styles.bulkActionBtn} onClick={downloadBulkTemplate}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      Download Template
                    </button>
                    <label className={`${styles.bulkActionBtn} ${styles.bulkFileLabel}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      {bulkFile ? bulkFile.name : "Upload CSV"}
                      <input type="file" accept=".csv,text/csv" onChange={handleBulkFileChange} style={{ display: "none" }} />
                    </label>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>CSV Data</label>
                    <textarea
                      className={styles.bulkTextarea}
                      rows={10}
                      placeholder={`name,vendor,url,category,renewal_date,billing_cycle,cost,payment_method,status,license_count,alert_days_before,notes\nGitHub Team,GitHub,https://github.com,Development,01-15-2026,monthly,25.00,Visa ending 4242,active,10,7,Team plan for dev org`}
                      value={bulkCsvText}
                      onChange={(e) => setBulkCsvText(e.target.value)}
                    />
                    <span className={styles.bulkHint}>Paste CSV data with header row. Dates: MM-DD-YYYY, MM/DD/YYYY, or YYYY-MM-DD.</span>
                  </div>

                  <div className={styles.bulkFieldList}>
                    <div className={styles.bulkFieldListTitle}>Required Fields</div>
                    <div className={styles.bulkFieldTags}>
                      {["name", "renewal_date", "billing_cycle", "cost"].map((f) => (
                        <span key={f} className={styles.bulkFieldTag}>{f}</span>
                      ))}
                    </div>
                    <div className={styles.bulkFieldListTitle} style={{ marginTop: "0.75rem" }}>Optional Fields</div>
                    <div className={styles.bulkFieldTags}>
                      {["vendor", "url", "category", "payment_method", "status", "license_count", "alert_days_before", "notes"].map((f) => (
                        <span key={f} className={`${styles.bulkFieldTag} ${styles.bulkFieldTagOptional}`}>{f}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className={styles.modalFooter}>
              {bulkResult ? (
                <button type="button" className={styles.modalBtnSave} onClick={closeBulkModal}>Done</button>
              ) : (
                <>
                  <button type="button" className={styles.modalBtnCancel} onClick={closeBulkModal}>Cancel</button>
                  <button
                    type="button"
                    className={styles.modalBtnSave}
                    onClick={handleBulkImport}
                    disabled={bulkImporting || !bulkCsvText.trim()}
                  >
                    {bulkImporting ? "Importing..." : "Import Renewals"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Drawer */}
      {showModal && (
        <>
          <div className={styles.formDrawerOverlay} onClick={() => setShowModal(false)} />
          <div className={styles.formDrawer}>
            <div className={styles.formDrawerHeader}>
              <h3 className={styles.formDrawerTitle}>{editingRenewal ? "Edit Renewal" : "Add Renewal"}</h3>
              <button type="button" className={styles.formDrawerClose} onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className={styles.formDrawerBody}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Name *</label>
                <input className={styles.formInput} type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. GitHub Team" autoFocus />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Vendor</label>
                <input className={styles.formInput} type="text" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="e.g. GitHub" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Category</label>
                <select className={styles.formSelect} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="">Select...</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>URL</label>
                <input className={styles.formInput} type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Cost *</label>
                <input className={styles.formInput} type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Billing Cycle *</label>
                <select className={styles.formSelect} value={form.billing_cycle} onChange={(e) => setForm((f) => ({ ...f, billing_cycle: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Status</label>
                <select className={styles.formSelect} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Renewal Date *</label>
                <input className={styles.formInput} type="date" value={form.renewal_date} onChange={(e) => setForm((f) => ({ ...f, renewal_date: e.target.value }))} />
                <span className={styles.formHint}>Format: MM-DD-YYYY</span>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Payment Method</label>
                <input className={styles.formInput} type="text" value={form.payment_method} onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))} placeholder="e.g. Visa ending 4242" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Licenses</label>
                <input className={styles.formInput} type="number" min="1" value={form.license_count} onChange={(e) => setForm((f) => ({ ...f, license_count: e.target.value }))} />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Alert Days Before</label>
                <input className={styles.formInput} type="number" min="0" value={form.alert_days_before} onChange={(e) => setForm((f) => ({ ...f, alert_days_before: e.target.value }))} />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Notes</label>
                <textarea className={styles.formTextarea} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
              </div>
            </div>
            <div className={styles.formDrawerFooter}>
              <button type="button" className={styles.modalBtnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className={styles.modalBtnSave} onClick={handleSubmit} disabled={!form.name.trim() || !form.renewal_date || !form.cost || submitting}>
                {submitting ? "Saving..." : editingRenewal ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./calendar.module.css";
import { SALES_EVENTS } from "@/lib/calendarData";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const NOTES_STORAGE_KEY = "ecommerce_calendar_notes";
const CALENDAR_TYPE = "ecommerce";
const DEFAULT_EVENT_COLOR = "#3b82f6";

function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatPrice(price, currency = "INR") {
  if (!price) return "\u20B90.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
  }).format(parseFloat(price));
}

function getFinancialStatusClass(status) {
  switch (status) {
    case "paid":
      return styles.statusPaid;
    case "pending":
    case "authorized":
      return styles.statusPending;
    case "refunded":
    case "voided":
      return styles.statusRefunded;
    default:
      return styles.statusPending;
  }
}

export default function CalendarPage() {
  const { activeProject } = useProject();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [viewMode, setViewMode] = useState("calendar");

  // Custom events + notes from API
  const [customEvents, setCustomEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ title: "", description: "", tips: "", start_date: "", end_date: "", color: DEFAULT_EVENT_COLOR });
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const migrationDone = useRef(false);

  // Google Calendar sync state
  const [gcalStatus, setGcalStatus] = useState({ connected: false });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState({ type: "", text: "" });
  const [refreshKey, setRefreshKey] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load Google Calendar status
  useEffect(() => {
    async function loadGcalStatus() {
      try {
        const res = await fetch("/api/gcal/status");
        if (res.ok) {
          const data = await res.json();
          setGcalStatus(data);
        }
      } catch {
        // Ignore
      }
    }
    loadGcalStatus();
  }, []);

  async function handleGcalSync(direction = "push") {
    setSyncing(true);
    setSyncMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/gcal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendar_type: CALENDAR_TYPE, direction, year }),
      });
      const data = await res.json();
      if (res.ok && data.synced) {
        const parts = [];
        if (data.pushed) parts.push(`${data.pushed} pushed`);
        if (data.pulled) parts.push(`${data.pulled} pulled`);
        setSyncMsg({ type: "success", text: parts.length ? `Synced: ${parts.join(", ")}` : "Already in sync" });
        if (data.pulled > 0) {
          // Reload events to show pulled items
          setRefreshKey((k) => k + 1);
        }
      } else {
        setSyncMsg({ type: "error", text: data.error || "Sync failed" });
      }
    } catch {
      setSyncMsg({ type: "error", text: "Sync failed" });
    }
    setSyncing(false);
  }

  // Load products + orders
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (activeProject) params.set("projectId", activeProject);
        const query = params.toString();
        const [productsRes, ordersRes] = await Promise.all([
          fetch(`/api/ecommerce/products${query ? `?${query}` : ""}`),
          fetch(`/api/ecommerce/orders${query ? `?${query}` : ""}`),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data.orders || []);
        }
      } catch {
        setError("Failed to load data");
      }
      setLoading(false);
    }
    loadData();
  }, [activeProject]);

  // Fetch custom events from API on month change
  useEffect(() => {
    async function fetchEvents() {
      setLoadingEvents(true);
      try {
        const evtParams = new URLSearchParams({ calendar_type: CALENDAR_TYPE, year: String(year), month: String(month + 1) });
        if (activeProject) evtParams.set("projectId", activeProject);
        const res = await fetch(`/api/calendar-events?${evtParams}`);
        if (res.ok) {
          const data = await res.json();
          setCustomEvents(data.events || []);

          // One-time migration: move localStorage notes to API
          if (!migrationDone.current) {
            migrationDone.current = true;
            try {
              const stored = localStorage.getItem(NOTES_STORAGE_KEY);
              if (stored) {
                const localNotes = JSON.parse(stored);
                const noteEntries = Object.entries(localNotes).filter(([, arr]) => arr && arr.length > 0);
                if (noteEntries.length > 0 && (data.events || []).filter(e => e.event_type === "note").length === 0) {
                  const postBody = { calendar_type: CALENDAR_TYPE, event_type: "note" };
                  if (activeProject && activeProject !== "all" && activeProject !== "personal") postBody.projectId = activeProject;
                  for (const [dateKey, arr] of noteEntries) {
                    for (const text of arr) {
                      await fetch("/api/calendar-events", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...postBody, title: text, start_date: dateKey, end_date: dateKey }),
                      });
                    }
                  }
                  localStorage.removeItem(NOTES_STORAGE_KEY);
                  const res2 = await fetch(`/api/calendar-events?${evtParams}`);
                  if (res2.ok) {
                    const data2 = await res2.json();
                    setCustomEvents(data2.events || []);
                  }
                }
              }
            } catch {
              // migration errors are non-fatal
            }
          }
        }
      } catch {
        // ignore fetch errors
      }
      setLoadingEvents(false);
    }
    fetchEvents();
  }, [year, month, refreshKey, activeProject]);

  // Derive notes from custom events (API-backed)
  const notes = useMemo(() => {
    const map = {};
    customEvents.filter(e => e.event_type === "note").forEach(e => {
      const key = e.start_date;
      if (!map[key]) map[key] = [];
      map[key].push({ id: e.id, text: e.title });
    });
    return map;
  }, [customEvents]);

  // Build custom events lookup (event_type === 'event')
  const customEventsByDate = useMemo(() => {
    const map = {};
    customEvents.filter(e => e.event_type === "event").forEach(e => {
      const start = new Date(e.start_date + "T00:00:00");
      const end = new Date(e.end_date + "T00:00:00");
      const cur = new Date(start);
      while (cur <= end) {
        const key = toDateKey(cur);
        if (!map[key]) map[key] = [];
        if (!map[key].some(x => x.id === e.id)) {
          map[key].push(e);
        }
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [customEvents]);

  // Build lookup maps
  const productsByDate = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const dateStr = p.published_at || p.created_at_shopify;
      if (!dateStr) return;
      const key = toDateKey(dateStr);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [products]);

  const ordersByDate = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o.created_at) return;
      const key = toDateKey(o.created_at);
      if (!map[key]) map[key] = [];
      map[key].push(o);
    });
    return map;
  }, [orders]);

  // Build sales lookup for the displayed year
  const salesByDate = useMemo(() => {
    const map = {};
    const y = currentDate.getFullYear();

    SALES_EVENTS.forEach((event) => {
      event.ranges.forEach(([sm, sd, em, ed]) => {
        const start = new Date(y, sm - 1, sd);
        const end = new Date(y, em - 1, ed);
        const cur = new Date(start);
        while (cur <= end) {
          const key = toDateKey(cur);
          if (!map[key]) map[key] = [];
          if (!map[key].some((e) => e.name === event.name)) {
            map[key].push({
              name: event.name,
              sunday: false,
              seasonal: !!event.seasonal,
              description: event.description,
              tips: event.tips || [],
            });
          }
          cur.setDate(cur.getDate() + 1);
        }
      });
    });

    // Sweet Sunday — every Sunday (Universal D2C Strategy)
    const firstDay = new Date(y, 0, 1);
    const offset = firstDay.getDay() === 0 ? 0 : 7 - firstDay.getDay();
    const firstSunday = new Date(y, 0, 1 + offset);
    const yearEnd = new Date(y, 11, 31);
    const cur = new Date(firstSunday);
    while (cur <= yearEnd) {
      const key = toDateKey(cur);
      if (!map[key]) map[key] = [];
      map[key].push({
        name: "Sunday Sundowner",
        sunday: true,
        seasonal: false,
        description: "6 PM \u2013 12 AM: Expect 20\u201325% order lift. Weekly flash bundles \u2014 sweets + savoury combo boxes.",
        tips: [
          "Promote limited inventory to drive urgency",
          "Monday operations must be at 1.5\u00D7 capacity",
        ],
      });
      cur.setDate(cur.getDate() + 7);
    }

    return map;
  }, [currentDate]);

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const days = [];

    // Days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, outside: true });
    }

    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), outside: false });
    }

    // Fill remaining cells to get 42 (6 weeks)
    while (days.length < 42) {
      const d = new Date(year, month + 1, days.length - startOffset - daysInMonth + 1);
      days.push({ date: d, outside: true });
    }

    return days;
  }, [year, month]);

  const today = toDateKey(new Date());
  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Stats for current month
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    let productCount = 0;
    let orderCount = 0;
    let noteCount = 0;
    let saleDays = 0;
    let customEventCount = 0;

    Object.keys(productsByDate).forEach((key) => {
      if (key.startsWith(monthPrefix)) productCount += productsByDate[key].length;
    });
    Object.keys(ordersByDate).forEach((key) => {
      if (key.startsWith(monthPrefix)) orderCount += ordersByDate[key].length;
    });
    Object.keys(notes).forEach((key) => {
      if (key.startsWith(monthPrefix)) noteCount += (notes[key] || []).length;
    });
    Object.keys(salesByDate).forEach((key) => {
      if (key.startsWith(monthPrefix)) saleDays++;
    });
    customEvents.filter(e => e.event_type === "event").forEach(e => {
      if (e.start_date.startsWith(monthPrefix) || e.end_date.startsWith(monthPrefix)) customEventCount++;
    });

    return { productCount, orderCount, noteCount, saleDays, customEventCount };
  }, [productsByDate, ordersByDate, notes, salesByDate, customEvents, year, month]);

  // List view data: all events for current month grouped by date
  const listViewData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = toDateKey(date);
      const dayProducts = productsByDate[key] || [];
      const dayOrders = ordersByDate[key] || [];
      const dayNotes = notes[key] || [];
      const daySales = (salesByDate[key] || []).filter((s) => !s.sunday);
      const dayCustom = customEventsByDate[key] || [];

      if (dayProducts.length || dayOrders.length || dayNotes.length || daySales.length || dayCustom.length) {
        items.push({
          date,
          dateKey: key,
          products: dayProducts,
          orders: dayOrders,
          notes: dayNotes,
          sales: daySales,
          custom: dayCustom,
        });
      }
    }
    return items;
  }, [year, month, productsByDate, ordersByDate, notes, salesByDate, customEventsByDate]);

  // Gantt view data
  const ganttData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    function clampToMonth(startMonth, startDay, endMonth, endDay) {
      const sDate = new Date(year, startMonth - 1, startDay);
      const eDate = new Date(year, endMonth - 1, endDay);
      const mStart = new Date(year, month, 1);
      const mEnd = new Date(year, month, daysInMonth);
      if (eDate < mStart || sDate > mEnd) return null;
      const clampedStart = sDate < mStart ? 1 : sDate.getDate();
      const clampedEnd = eDate > mEnd ? daysInMonth : eDate.getDate();
      return {
        startDay: clampedStart,
        endDay: clampedEnd,
        startsBeforeMonth: sDate < mStart,
        endsAfterMonth: eDate > mEnd,
      };
    }

    // Sales bars (multi-day events, excluding Sunday Sundowner)
    const salesBars = [];
    SALES_EVENTS.forEach((event) => {
      event.ranges.forEach(([sm, sd, em, ed]) => {
        const clamped = clampToMonth(sm, sd, em, ed);
        if (clamped) {
          salesBars.push({
            name: event.name,
            seasonal: !!event.seasonal,
            ...clamped,
          });
        }
      });
    });

    // Sunday markers within this month
    const sundayMarkers = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date.getDay() === 0) {
        sundayMarkers.push({ day: d });
      }
    }

    // Product markers (single-day)
    const productMarkers = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      const dayProducts = productsByDate[key];
      if (dayProducts && dayProducts.length > 0) {
        productMarkers.push({ day: d, count: dayProducts.length });
      }
    }

    // Order markers (single-day)
    const orderMarkers = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      const dayOrders = ordersByDate[key];
      if (dayOrders && dayOrders.length > 0) {
        orderMarkers.push({ day: d, count: dayOrders.length });
      }
    }

    // Note markers (single-day)
    const noteMarkers = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      const dayNotes = notes[key];
      if (dayNotes && dayNotes.length > 0) {
        noteMarkers.push({ day: d, count: dayNotes.length });
      }
    }

    // Custom event bars
    const customBars = [];
    const customMarkers = [];
    customEvents.filter(e => e.event_type === "event").forEach(e => {
      const sDate = new Date(e.start_date + "T00:00:00");
      const eDate = new Date(e.end_date + "T00:00:00");
      const mStart = new Date(year, month, 1);
      const mEnd = new Date(year, month, daysInMonth);
      if (eDate < mStart || sDate > mEnd) return;
      const clampedStart = sDate < mStart ? 1 : sDate.getDate();
      const clampedEnd = eDate > mEnd ? daysInMonth : eDate.getDate();
      if (clampedStart === clampedEnd) {
        customMarkers.push({ day: clampedStart, name: e.title });
      } else {
        customBars.push({
          name: e.title,
          startDay: clampedStart,
          endDay: clampedEnd,
          startsBeforeMonth: sDate < mStart,
          endsAfterMonth: eDate > mEnd,
        });
      }
    });

    return {
      daysInMonth,
      salesBars,
      sundayMarkers,
      productMarkers,
      orderMarkers,
      noteMarkers,
      customBars,
      customMarkers,
    };
  }, [year, month, productsByDate, ordersByDate, notes, customEvents]);

  // Navigation
  function goToPrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function selectDay(dateKey) {
    setSelectedDate(dateKey === selectedDate ? null : dateKey);
    setShowNoteForm(false);
    setEditingNoteIndex(null);
    setNoteText("");
  }

  // Note CRUD (API-backed)
  async function handleAddNote() {
    if (!noteText.trim() || !selectedDate) return;
    try {
      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendar_type: CALENDAR_TYPE, event_type: "note", title: noteText.trim(), start_date: selectedDate, end_date: selectedDate, ...(activeProject && activeProject !== "all" && activeProject !== "personal" ? { projectId: activeProject } : {}) }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setCustomEvents(prev => [...prev, event]);
      }
    } catch { /* ignore */ }
    setNoteText("");
    setShowNoteForm(false);
  }

  function handleEditNote(index) {
    const dayNotes = notes[selectedDate] || [];
    setNoteText(dayNotes[index].text);
    setEditingNoteIndex(index);
    setShowNoteForm(true);
  }

  async function handleSaveEdit() {
    if (!noteText.trim() || !selectedDate || editingNoteIndex === null) return;
    const dayNotes = notes[selectedDate] || [];
    const noteObj = dayNotes[editingNoteIndex];
    if (!noteObj) return;
    try {
      const res = await fetch(`/api/calendar-events/${noteObj.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteText.trim() }),
      });
      if (res.ok) {
        const { event } = await res.json();
        setCustomEvents(prev => prev.map(e => e.id === event.id ? event : e));
      }
    } catch { /* ignore */ }
    setNoteText("");
    setEditingNoteIndex(null);
    setShowNoteForm(false);
  }

  async function handleDeleteNote(index) {
    if (!selectedDate) return;
    const dayNotes = notes[selectedDate] || [];
    const noteObj = dayNotes[index];
    if (!noteObj) return;
    try {
      await fetch(`/api/calendar-events/${noteObj.id}`, { method: "DELETE" });
      setCustomEvents(prev => prev.filter(e => e.id !== noteObj.id));
    } catch { /* ignore */ }
  }

  function cancelNoteForm() {
    setShowNoteForm(false);
    setEditingNoteIndex(null);
    setNoteText("");
  }

  // Custom event CRUD
  function openAddEventModal() {
    setEditingEvent(null);
    setEventForm({
      title: "",
      description: "",
      tips: "",
      start_date: selectedDate || toDateKey(new Date()),
      end_date: selectedDate || toDateKey(new Date()),
      color: DEFAULT_EVENT_COLOR,
    });
    setShowEventModal(true);
  }

  function openEditEventModal(event) {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || "",
      tips: (event.tips || []).join("\n"),
      start_date: event.start_date,
      end_date: event.end_date,
      color: event.color || DEFAULT_EVENT_COLOR,
    });
    setShowEventModal(true);
  }

  async function handleSubmitEvent() {
    if (!eventForm.title.trim() || !eventForm.start_date) return;
    setSubmittingEvent(true);
    try {
      const payload = {
        calendar_type: CALENDAR_TYPE,
        event_type: "event",
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        tips: eventForm.tips.split("\n").map(t => t.trim()).filter(Boolean),
        start_date: eventForm.start_date,
        end_date: eventForm.end_date || eventForm.start_date,
        color: eventForm.color || null,
        ...(activeProject && activeProject !== "all" && activeProject !== "personal" ? { projectId: activeProject } : {}),
      };

      if (editingEvent) {
        const res = await fetch(`/api/calendar-events/${editingEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const { event } = await res.json();
          setCustomEvents(prev => prev.map(e => e.id === event.id ? event : e));
        }
      } else {
        const res = await fetch("/api/calendar-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const { event } = await res.json();
          setCustomEvents(prev => [...prev, event]);
        }
      }
    } catch { /* ignore */ }
    setSubmittingEvent(false);
    setShowEventModal(false);
  }

  async function handleDeleteEvent(eventId) {
    try {
      await fetch(`/api/calendar-events/${eventId}`, { method: "DELETE" });
      setCustomEvents(prev => prev.filter(e => e.id !== eventId));
    } catch { /* ignore */ }
  }

  // Selected day data
  const selectedProducts = selectedDate ? productsByDate[selectedDate] || [] : [];
  const selectedOrders = selectedDate ? ordersByDate[selectedDate] || [] : [];
  const selectedNotes = selectedDate ? (notes[selectedDate] || []) : [];
  const selectedSales = selectedDate ? salesByDate[selectedDate] || [] : [];
  const selectedCustomEvents = selectedDate ? customEventsByDate[selectedDate] || [] : [];
  const selectedDateFormatted = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  // Loading skeleton
  if (loading) {
    const s = {
      background:
        "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      borderRadius: "8px",
    };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("140px", "28px", "0.5rem")} />
        <div style={b("300px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.statCard}>
              <div style={b("60%", "12px", "0.5rem")} />
              <div style={b("40%", "28px")} />
            </div>
          ))}
        </div>
        <div className={styles.calendarContainer}>
          <div className={styles.dayHeaders}>
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className={styles.dayHeader}>{d}</div>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className={styles.dayCell}>
                <div style={b("20px", "14px", "4px")} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>eCommerce Calendar</h1>
      <p className={styles.subheading}>Product launches, orders, sales events, and notes at a glance.</p>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Products This Month</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueAccent}`}>{monthStats.productCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Orders This Month</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueBlue}`}>{monthStats.orderCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Sale Days</div>
            <span className={styles.statIconRupee}>₹</span>
          </div>
          <div className={`${styles.statValue} ${styles.statValuePurple}`}>{monthStats.saleDays}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Custom Events</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueBlue}`}>{monthStats.customEventCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Notes</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueAmber}`}>{monthStats.noteCount}</div>
        </div>
      </div>

      {/* Calendar Header */}
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
              className={`${styles.viewToggleBtn} ${viewMode === "gantt" ? styles.viewToggleBtnActive : ""}`}
              onClick={() => setViewMode("gantt")}
              title="Gantt view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="13" height="4" rx="1" />
                <rect x="7" y="10" width="14" height="4" rx="1" />
                <rect x="5" y="16" width="10" height="4" rx="1" />
              </svg>
            </button>
          </div>
          <div className={styles.syncExportGroup}>
            <a
              href={`/api/calendar-events/export?calendar_type=ecommerce&year=${year}`}
              className={styles.exportBtn}
              title="Download .ics file"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export .ics
            </a>
            {gcalStatus.connected ? (
              <button
                type="button"
                className={styles.syncBtn}
                onClick={() => handleGcalSync("both")}
                disabled={syncing}
                title="Sync with Google Calendar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {syncing ? "Syncing..." : "Sync Google Calendar"}
              </button>
            ) : (
              <a href="/api/gcal/connect" className={styles.connectGcalLink} title="Connect Google Calendar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Connect Google Cal
              </a>
            )}
            {syncMsg.text && (
              <span className={syncMsg.type === "error" ? styles.syncMsgError : styles.syncMsgSuccess}>
                {syncMsg.text}
              </span>
            )}
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

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          Products
        </span>
        <span className={styles.legendItem}>
          <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Orders
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendRupee}>₹</span>
          Sales
        </span>
        <span className={styles.legendItem}>
          <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Custom
        </span>
        <span className={styles.legendItem}>
          <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Notes
        </span>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className={styles.listContainer}>
          {listViewData.length === 0 ? (
            <div className={styles.emptyDetail}>No events this month.</div>
          ) : (
            listViewData.map((item) => {
              const dateFormatted = item.date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const isToday = item.dateKey === today;
              return (
                <div
                  key={item.dateKey}
                  className={`${styles.listDay} ${isToday ? styles.listDayToday : ""}`}
                  onClick={() => setSelectedDate(item.dateKey)}
                >
                  <div className={styles.listDayHeader}>
                    <span className={styles.listDayDate}>{dateFormatted}</span>
                    {isToday && <span className={styles.listDayTodayBadge}>Today</span>}
                    <div className={styles.listDayDots}>
                      {item.sales.length > 0 && <span className={styles.dotRupee}>₹</span>}
                      {item.products.length > 0 && <svg className={`${styles.dot} ${styles.dotProductIcon}`} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
                      {item.orders.length > 0 && <svg className={`${styles.dot} ${styles.dotOrderIcon}`} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
                      {item.notes.length > 0 && <svg className={`${styles.dot} ${styles.dotNoteIcon}`} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                    </div>
                  </div>
                  <div className={styles.listDayEvents}>
                    {item.sales.map((sale, i) => (
                      <div key={`sale-${i}`} className={styles.listEvent}>
                        <span className={styles.listEventRupee}>₹</span>
                        <span className={styles.listEventName}>{sale.name}</span>
                        {sale.seasonal && <span className={styles.saleSeasonal}>Seasonal</span>}
                      </div>
                    ))}
                    {item.products.map((p, i) => (
                      <div key={`prod-${i}`} className={styles.listEvent}>
                        <svg className={styles.listEventIcon} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        <span className={styles.listEventName}>{p.title}</span>
                        {p.price && <span className={styles.listEventMeta}>{formatPrice(p.price)}</span>}
                      </div>
                    ))}
                    {item.orders.map((o, i) => (
                      <div key={`order-${i}`} className={styles.listEvent}>
                        <svg className={styles.listEventIcon} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        <span className={styles.listEventName}>Order #{o.order_number}</span>
                        <span className={styles.listEventMeta}>{formatPrice(o.total_price, o.currency || "INR")}</span>
                      </div>
                    ))}
                    {(item.custom || []).map((ce, i) => (
                      <div key={`custom-${i}`} className={styles.listEvent}>
                        <svg className={styles.listEventIcon} viewBox="0 0 24 24" fill="none" stroke={ce.color || "#3b82f6"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span className={styles.listEventName}>{ce.title}</span>
                      </div>
                    ))}
                    {item.notes.map((note, i) => (
                      <div key={`note-${i}`} className={styles.listEvent}>
                        <svg className={styles.listEventIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span className={styles.listEventName}>{note.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Gantt View */}
      {viewMode === "gantt" && (
        <div className={styles.ganttContainer}>
          {/* Header row with day numbers */}
          <div className={styles.ganttHeaderRow}>
            <div className={styles.ganttLabelCol}>Event</div>
            <div className={styles.ganttDayCols} style={{ gridTemplateColumns: `repeat(${ganttData.daysInMonth}, minmax(28px, 1fr))` }}>
              {Array.from({ length: ganttData.daysInMonth }, (_, i) => {
                const d = i + 1;
                const date = new Date(year, month, d);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const dayKey = toDateKey(date);
                const isToday2 = dayKey === today;
                let cls = styles.ganttDayCol;
                if (isToday2) cls += ` ${styles.ganttDayColToday}`;
                else if (isWeekend) cls += ` ${styles.ganttDayColWeekend}`;
                return (
                  <div key={d} className={cls} onClick={() => selectDay(dayKey)}>
                    {d}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sales Events Group */}
          {(ganttData.salesBars.length > 0 || ganttData.sundayMarkers.length > 0) && (
            <div className={styles.ganttGroup}>
              <div className={styles.ganttGroupHeader}>
                <span className={styles.legendRupee}>₹</span> Sales Events
              </div>
              {ganttData.salesBars.map((bar, i) => (
                <div key={`sale-${i}`} className={styles.ganttRow}>
                  <div className={styles.ganttLabelCol} title={bar.name}>
                    <span className={styles.ganttLabelText}>{bar.name}</span>
                    {bar.seasonal && <span className={styles.ganttLabelTag}>S</span>}
                  </div>
                  <div className={styles.ganttDayCols} style={{ gridTemplateColumns: `repeat(${ganttData.daysInMonth}, minmax(28px, 1fr))` }}>
                    {Array.from({ length: ganttData.daysInMonth }, (_, j) => {
                      const d = j + 1;
                      const inRange = d >= bar.startDay && d <= bar.endDay;
                      const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      if (!inRange) return <div key={d} className={styles.ganttCell} />;
                      const isStart = d === bar.startDay;
                      const isEnd = d === bar.endDay;
                      let barCls = styles.ganttBar + " " + styles.ganttBarSale;
                      if (isStart) barCls += " " + styles.ganttBarStart;
                      if (isEnd) barCls += " " + styles.ganttBarEnd;
                      if (isStart && bar.startsBeforeMonth) barCls += " " + styles.ganttBarClipLeft;
                      if (isEnd && bar.endsAfterMonth) barCls += " " + styles.ganttBarClipRight;
                      return (
                        <div key={d} className={styles.ganttCell} onClick={() => selectDay(dayKey)}>
                          <div className={barCls}>
                            {isStart && <span className={styles.ganttBarLabel}>{bar.name}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {ganttData.sundayMarkers.length > 0 && (
                <div className={styles.ganttRow}>
                  <div className={styles.ganttLabelCol}>
                    <span className={styles.ganttLabelText}>Sunday Sundowner</span>
                  </div>
                  <div className={styles.ganttDayCols} style={{ gridTemplateColumns: `repeat(${ganttData.daysInMonth}, minmax(28px, 1fr))` }}>
                    {Array.from({ length: ganttData.daysInMonth }, (_, j) => {
                      const d = j + 1;
                      const isSunday = ganttData.sundayMarkers.some((m) => m.day === d);
                      const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      return (
                        <div key={d} className={styles.ganttCell} onClick={isSunday ? () => selectDay(dayKey) : undefined}>
                          {isSunday && <div className={`${styles.ganttMarker} ${styles.ganttMarkerSale}`} title="Sunday Sundowner">₹</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Products Group */}
          {ganttData.productMarkers.length > 0 && (
            <div className={styles.ganttGroup}>
              <div className={styles.ganttGroupHeader}>
                <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                Products
              </div>
              <div className={styles.ganttRow}>
                <div className={styles.ganttLabelCol}>
                  <span className={styles.ganttLabelText}>Launches</span>
                </div>
                <div className={styles.ganttDayCols} style={{ gridTemplateColumns: `repeat(${ganttData.daysInMonth}, minmax(28px, 1fr))` }}>
                  {Array.from({ length: ganttData.daysInMonth }, (_, j) => {
                    const d = j + 1;
                    const marker = ganttData.productMarkers.find((m) => m.day === d);
                    const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    return (
                      <div key={d} className={styles.ganttCell} onClick={marker ? () => selectDay(dayKey) : undefined}>
                        {marker && <div className={`${styles.ganttMarker} ${styles.ganttMarkerProduct}`}>{marker.count}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Orders Group */}
          {ganttData.orderMarkers.length > 0 && (
            <div className={styles.ganttGroup}>
              <div className={styles.ganttGroupHeader}>
                <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Orders
              </div>
              <div className={styles.ganttRow}>
                <div className={styles.ganttLabelCol}>
                  <span className={styles.ganttLabelText}>Orders</span>
                </div>
                <div className={styles.ganttDayCols} style={{ gridTemplateColumns: `repeat(${ganttData.daysInMonth}, minmax(28px, 1fr))` }}>
                  {Array.from({ length: ganttData.daysInMonth }, (_, j) => {
                    const d = j + 1;
                    const marker = ganttData.orderMarkers.find((m) => m.day === d);
                    const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    return (
                      <div key={d} className={styles.ganttCell} onClick={marker ? () => selectDay(dayKey) : undefined}>
                        {marker && <div className={`${styles.ganttMarker} ${styles.ganttMarkerOrder}`}>{marker.count}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Custom Events Group */}
          {(ganttData.customBars.length > 0 || ganttData.customMarkers.length > 0) && (
            <div className={styles.ganttGroup}>
              <div className={styles.ganttGroupHeader}>
                <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Custom Events
              </div>
              {ganttData.customBars.map((bar, i) => (
                <div key={`custom-bar-${i}`} className={styles.ganttRow}>
                  <div className={styles.ganttLabelCol} title={bar.name}>
                    <span className={styles.ganttLabelText}>{bar.name}</span>
                  </div>
                  <div className={styles.ganttDayCols} style={{ gridTemplateColumns: `repeat(${ganttData.daysInMonth}, minmax(28px, 1fr))` }}>
                    {Array.from({ length: ganttData.daysInMonth }, (_, j) => {
                      const d = j + 1;
                      const inRange = d >= bar.startDay && d <= bar.endDay;
                      const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      if (!inRange) return <div key={d} className={styles.ganttCell} />;
                      const isStart = d === bar.startDay;
                      const isEnd = d === bar.endDay;
                      let barCls = styles.ganttBar + " " + styles.ganttBarCustom;
                      if (isStart) barCls += " " + styles.ganttBarStart;
                      if (isEnd) barCls += " " + styles.ganttBarEnd;
                      if (isStart && bar.startsBeforeMonth) barCls += " " + styles.ganttBarClipLeft;
                      if (isEnd && bar.endsAfterMonth) barCls += " " + styles.ganttBarClipRight;
                      return (
                        <div key={d} className={styles.ganttCell} onClick={() => selectDay(dayKey)}>
                          <div className={barCls}>
                            {isStart && <span className={styles.ganttBarLabel}>{bar.name}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {ganttData.customMarkers.length > 0 && (
                <div className={styles.ganttRow}>
                  <div className={styles.ganttLabelCol}>
                    <span className={styles.ganttLabelText}>Single-day</span>
                  </div>
                  <div className={styles.ganttDayCols} style={{ gridTemplateColumns: `repeat(${ganttData.daysInMonth}, minmax(28px, 1fr))` }}>
                    {Array.from({ length: ganttData.daysInMonth }, (_, j) => {
                      const d = j + 1;
                      const marker = ganttData.customMarkers.find((m) => m.day === d);
                      const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      return (
                        <div key={d} className={styles.ganttCell} onClick={marker ? () => selectDay(dayKey) : undefined}>
                          {marker && <div className={`${styles.ganttMarker} ${styles.ganttMarkerCustom}`} title={marker.name}>E</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes Group */}
          {ganttData.noteMarkers.length > 0 && (
            <div className={styles.ganttGroup}>
              <div className={styles.ganttGroupHeader}>
                <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Notes
              </div>
              <div className={styles.ganttRow}>
                <div className={styles.ganttLabelCol}>
                  <span className={styles.ganttLabelText}>Notes</span>
                </div>
                <div className={styles.ganttDayCols} style={{ gridTemplateColumns: `repeat(${ganttData.daysInMonth}, minmax(28px, 1fr))` }}>
                  {Array.from({ length: ganttData.daysInMonth }, (_, j) => {
                    const d = j + 1;
                    const marker = ganttData.noteMarkers.find((m) => m.day === d);
                    const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    return (
                      <div key={d} className={styles.ganttCell} onClick={marker ? () => selectDay(dayKey) : undefined}>
                        {marker && <div className={`${styles.ganttMarker} ${styles.ganttMarkerNote}`}>{marker.count}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {ganttData.salesBars.length === 0 && ganttData.sundayMarkers.length === 0 && ganttData.productMarkers.length === 0 && ganttData.orderMarkers.length === 0 && ganttData.customBars.length === 0 && ganttData.customMarkers.length === 0 && ganttData.noteMarkers.length === 0 && (
            <div className={styles.emptyDetail}>No events this month.</div>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      {viewMode === "calendar" && <div className={styles.calendarContainer}>
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
            const dayProducts = productsByDate[key] || [];
            const dayOrders = ordersByDate[key] || [];
            const dayNotes = notes[key] || [];
            const daySales = salesByDate[key] || [];
            const dayCustom = customEventsByDate[key] || [];
            const hasProducts = dayProducts.length > 0;
            const hasOrders = dayOrders.length > 0;
            const hasNotes = dayNotes.length > 0;
            const hasSales = daySales.length > 0;
            const hasCustom = dayCustom.length > 0;
            const specificSales = daySales.filter((s) => !s.sunday && !s.seasonal);
            const hasSundaySale = daySales.some((s) => s.sunday);

            let cellClass = styles.dayCell;
            if (day.outside) cellClass += ` ${styles.dayCellOutside}`;
            if (hasSales && !isToday) cellClass += ` ${styles.dayCellSale}`;
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
                {(hasProducts || hasOrders || hasNotes || hasSales || hasCustom) && (
                  <div className={styles.dots}>
                    {hasSales && <span className={styles.dotRupee}>₹</span>}
                    {hasProducts && <svg className={`${styles.dot} ${styles.dotProductIcon}`} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
                    {hasOrders && <svg className={`${styles.dot} ${styles.dotOrderIcon}`} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
                    {hasCustom && <svg className={`${styles.dot} ${styles.dotCustomIcon}`} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                    {hasNotes && <svg className={`${styles.dot} ${styles.dotNoteIcon}`} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                  </div>
                )}
                {(hasProducts || hasOrders || hasNotes || hasSales || hasCustom) && (
                  <div className={styles.badges}>
                    {specificSales.length > 0 && (
                      <span className={`${styles.badge} ${styles.badgeSale}`}>
                        {specificSales.map((s) => s.name).join(" \u00B7 ")}
                      </span>
                    )}
                    {hasSundaySale && (
                      <span className={`${styles.badge} ${styles.badgeSale}`}>
                        Sunday Sundowner
                      </span>
                    )}
                    {hasProducts && (
                      <span className={`${styles.badge} ${styles.badgeProduct}`}>
                        {dayProducts.length} product{dayProducts.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {hasOrders && (
                      <span className={`${styles.badge} ${styles.badgeOrder}`}>
                        {dayOrders.length} order{dayOrders.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {hasCustom && (
                      <span className={`${styles.badge} ${styles.badgeCustom}`}>
                        {dayCustom.map(e => e.title).join(" \u00B7 ")}
                      </span>
                    )}
                    {hasNotes && (
                      <span className={`${styles.badge} ${styles.badgeNote}`}>
                        {dayNotes.length} note{dayNotes.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>}

      {/* Right sidebar drawer */}
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
            {selectedProducts.length === 0 && selectedOrders.length === 0 && selectedNotes.length === 0 && selectedSales.length === 0 && selectedCustomEvents.length === 0 && !showNoteForm ? (
              <div className={styles.emptyDetail}>No products, orders, sales, or notes for this day.</div>
            ) : (
              <>
                {/* Sales Events */}
                {selectedSales.length > 0 && (
                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionTitle}>
                      <span className={styles.legendRupee}>₹</span>
                      Holiday & Revenue Calendar
                      <span className={styles.detailSectionCount}>({selectedSales.length})</span>
                    </div>
                    {selectedSales.map((sale, idx) => (
                      <div key={idx} className={styles.saleItem}>
                        <div className={styles.saleItemHeader}>
                          <span className={styles.saleIcon}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                          </span>
                          <span className={styles.saleName}>{sale.name}</span>
                          {sale.sunday && <span className={styles.saleSunday}>Every Sunday</span>}
                          {sale.seasonal && <span className={styles.saleSeasonal}>Seasonal</span>}
                        </div>
                        {sale.description && (
                          <p className={styles.saleDescription}>{sale.description}</p>
                        )}
                        {sale.tips && sale.tips.length > 0 && (
                          <ul className={styles.saleTips}>
                            {sale.tips.map((tip, i) => (
                              <li key={i} className={styles.saleTip}>{tip}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Products */}
                {selectedProducts.length > 0 && (
                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionTitle}>
                      <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                      Products
                      <span className={styles.detailSectionCount}>({selectedProducts.length})</span>
                    </div>
                    {selectedProducts.map((p) => (
                      <div key={p.id} className={styles.productItem}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.title} className={styles.productThumb} />
                        ) : (
                          <div className={styles.productThumbPlaceholder}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                        <div className={styles.productInfo}>
                          <div className={styles.productTitle}>{p.title}</div>
                          <div className={styles.productMeta}>
                            <span>{p.status || "active"}</span>
                            {p.price && <span className={styles.productPrice}>{formatPrice(p.price)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Orders */}
                {selectedOrders.length > 0 && (
                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionTitle}>
                      <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      Orders
                      <span className={styles.detailSectionCount}>({selectedOrders.length})</span>
                    </div>
                    {selectedOrders.map((o) => (
                      <div key={o.id} className={styles.orderItem}>
                        <div className={styles.orderInfo}>
                          <div className={styles.orderNumber}>#{o.order_number}</div>
                          <div className={styles.orderCustomer}>
                            {o.customer_name || o.customer_email || "Guest"}
                          </div>
                        </div>
                        <span className={`${styles.orderStatus} ${getFinancialStatusClass(o.financial_status)}`}>
                          {o.financial_status || "pending"}
                        </span>
                        <div className={styles.orderTotal}>
                          {formatPrice(o.total_price, o.currency || "INR")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Events */}
                <div className={styles.detailSection}>
                  <div className={styles.detailSectionTitle}>
                    <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Custom Events
                    {selectedCustomEvents.length > 0 && (
                      <span className={styles.detailSectionCount}>({selectedCustomEvents.length})</span>
                    )}
                  </div>
                  {selectedCustomEvents.map((evt) => (
                    <div key={evt.id} className={styles.customEventItem} style={evt.color ? { borderLeftColor: evt.color } : undefined}>
                      <div className={styles.customEventItemHeader}>
                        <span className={styles.customEventName}>{evt.title}</span>
                        <div className={styles.customEventActions}>
                          <button type="button" className={styles.customEventActionBtn} onClick={() => openEditEventModal(evt)} title="Edit event">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                          </button>
                          <button type="button" className={`${styles.customEventActionBtn} ${styles.customEventActionBtnDanger}`} onClick={() => handleDeleteEvent(evt.id)} title="Delete event">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </div>
                      </div>
                      {evt.description && <p className={styles.customEventDescription}>{evt.description}</p>}
                      {evt.tips && evt.tips.length > 0 && (
                        <ul className={styles.customEventTips}>
                          {evt.tips.map((tip, i) => <li key={i} className={styles.customEventTip}>{tip}</li>)}
                        </ul>
                      )}
                      {evt.start_date !== evt.end_date && (
                        <div className={styles.customEventDates}>{evt.start_date} to {evt.end_date}</div>
                      )}
                    </div>
                  ))}
                  <button type="button" className={styles.addEventBtn} onClick={openAddEventModal}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Event
                  </button>
                </div>

                {/* Notes */}
                <div className={styles.detailSection}>
                  <div className={styles.detailSectionTitle}>
                    <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    Notes
                    {selectedNotes.length > 0 && (
                      <span className={styles.detailSectionCount}>({selectedNotes.length})</span>
                    )}
                  </div>
                  {selectedNotes.map((note, idx) => (
                    <div key={note.id} className={styles.noteItem}>
                      <span className={styles.noteText}>{note.text}</span>
                      <div className={styles.noteActions}>
                        <button
                          type="button"
                          className={styles.noteActionBtn}
                          onClick={() => handleEditNote(idx)}
                          title="Edit note"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`${styles.noteActionBtn} ${styles.noteActionBtnDanger}`}
                          onClick={() => handleDeleteNote(idx)}
                          title="Delete note"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {showNoteForm ? (
                    <div className={styles.noteForm}>
                      <textarea
                        className={styles.noteTextarea}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Write a note..."
                        autoFocus
                      />
                      <div className={styles.noteFormButtons}>
                        <button
                          type="button"
                          className={`${styles.noteFormBtn} ${styles.noteFormBtnSave}`}
                          onClick={editingNoteIndex !== null ? handleSaveEdit : handleAddNote}
                          disabled={!noteText.trim()}
                        >
                          {editingNoteIndex !== null ? "Save" : "Add Note"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.noteFormBtn} ${styles.noteFormBtnCancel}`}
                          onClick={cancelNoteForm}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.addNoteBtn}
                      onClick={() => {
                        setShowNoteForm(true);
                        setEditingNoteIndex(null);
                        setNoteText("");
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Note
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        </>
      )}
      {showEventModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEventModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingEvent ? "Edit Event" : "Add Event"}</h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowEventModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Title</label>
                <input className={styles.formInput} type="text" value={eventForm.title} onChange={(e) => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" autoFocus />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Start Date</label>
                  <input className={styles.formInput} type="date" value={eventForm.start_date} onChange={(e) => setEventForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>End Date</label>
                  <input className={styles.formInput} type="date" value={eventForm.end_date} onChange={(e) => setEventForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Description</label>
                <textarea className={styles.formTextarea} value={eventForm.description} onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Tips</label>
                <textarea className={styles.formTextarea} value={eventForm.tips} onChange={(e) => setEventForm(f => ({ ...f, tips: e.target.value }))} placeholder="One tip per line (optional)" />
                <span className={styles.formHint}>One tip per line</span>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Color</label>
                <input className={styles.formColorInput} type="color" value={eventForm.color} onChange={(e) => setEventForm(f => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.modalBtnCancel} onClick={() => setShowEventModal(false)}>Cancel</button>
              <button type="button" className={styles.modalBtnSave} onClick={handleSubmitEvent} disabled={!eventForm.title.trim() || submittingEvent}>
                {submittingEvent ? "Saving..." : editingEvent ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

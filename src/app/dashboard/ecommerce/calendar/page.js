"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./calendar.module.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const NOTES_STORAGE_KEY = "ecommerce_calendar_notes";

// 2026 Holiday & Revenue Calendar — Sweet & Savoury Focus
// Each range: [startMonth, startDay, endMonth, endDay] (1-based months)
const SALES_EVENTS = [
  {
    name: "New Year Fresh Start",
    ranges: [[1, 1, 1, 5]],
    description: "Sweet gift packs, assorted boxes & combo hampers.",
    tips: [
      "Position as \u201CStart the Year Sweet\u201D with online delivery",
      "Sweet consumption rises as households host gatherings",
    ],
  },
  {
    name: "Pongal / Harvest Super Peak",
    ranges: [[1, 13, 1, 17]],
    description: "Essential window for festive sweets: Chakkara Pongal, Ariselu, Sundal & Murukku. Heavy family & bulk orders.",
    tips: [
      "Promote Pongal kits, murukku & savouries",
      "Bulk packs + same-day delivery messaging",
      "Heavy family & bulk order volumes expected",
    ],
  },
  {
    name: "Valentine\u2019s Day",
    ranges: [[2, 9, 2, 14]],
    description: "Seasonal romantic flavour combos (pink/red barfi, chocolate twists). Low\u2013Medium peak in South India.",
    tips: [
      "Small premium sweet boxes for couples & gifting",
      "Sugar-reduced & dry-fruit sweets",
    ],
  },
  {
    name: "Holi Season",
    ranges: [[2, 26, 3, 7]],
    description: "Holi assortments with both sweets and crunchy savouries.",
    tips: [
      "Emphasize colourful sweet assortments and murukku packs",
    ],
  },
  {
    name: "Ugadi \u2013 South Regional New Year",
    ranges: [[3, 17, 3, 19]],
    description: "Major South Indian New Year peak (TN, KA, AP, TS). Bobbatlu / Puran Poli and traditional New Year assortments.",
    tips: [
      "Traditional New Year sweet assortments",
      "Bobbatlu / Puran Poli prominently featured",
      "Festive gift packs for family visits",
    ],
  },
  {
    name: "Eid-Ul-Fitr",
    ranges: [[3, 14, 4, 2]],
    description: "Gifting bundles and festive sweets like kaju katli, laddu, halwa.",
    tips: [
      "Bulk orders for family gatherings",
      "Date varies yearly \u2014 plan flexible inventory",
    ],
  },
  {
    name: "April Anomaly",
    ranges: [[4, 4, 4, 6]],
    description: "National spike visible in South India. Short burst of unplanned orders.",
    tips: [
      "Keep inventory ready for unexpected order lift",
      "Flash promotions on best-sellers",
    ],
  },
  {
    name: "Vishu / Tamil New Year",
    ranges: [[4, 13, 4, 15]],
    description: "Kerala (Vishu) & Tamil Nadu (Puthandu) New Year celebrations. Payasam mixes, light sweets & savouries for guest visits.",
    tips: [
      "Payasam mixes and traditional sweet packs",
      "Light sweets & savouries for guest visits",
    ],
  },
  {
    name: "Summer Prep Spike",
    ranges: [[4, 24, 4, 30]],
    description: "Pre-summer order spike for gatherings and travel sweets.",
    tips: [
      "Travel-friendly sweet packs",
      "Light savouries & tea-time snacks",
    ],
  },
  {
    name: "Summer Seasonal Treats",
    ranges: [[4, 1, 6, 23]],
    seasonal: true,
    description: "Spotlight seasonal items like Mango Barfi and chilled sweets.",
    tips: [
      "Limited-edition summer specials create urgency",
      "Seasonal limited editions: jaggery sweets, lower-sugar options, festive savouries",
    ],
  },
  {
    name: "Mid-Year EOSS",
    ranges: [[6, 24, 6, 30]],
    description: "End-of-season sale. Evergreen sweets, combo & value packs. Inventory cleanup window.",
    tips: [
      "Combo & value packs to move inventory",
      "Promote online with delivery cut-off reminders",
      "Inventory cleanup before festive build-up",
    ],
  },
  {
    name: "August Convergence",
    ranges: [[8, 21, 8, 28]],
    description: "Raksha Bandhan + Janmashtami + Onam prep. Multiple festival demand converges.",
    tips: [
      "Gift boxes + snack bundles for Aug festivals",
      "Sweet + salty savoury combo packs for long festival visits",
    ],
  },
  {
    name: "Onam Gifting Marathon",
    ranges: [[8, 23, 8, 31]],
    description: "South Super Peak. Onam sweet boxes, Kerala-style savouries, premium gift hampers. Aug 23 (Sunday) is highest-intent day.",
    tips: [
      "Onam sweet boxes & Kerala-style savouries",
      "Premium gift hampers for corporate & family",
      "Plan raw-material locking in July",
      "Aug 23 Sunday \u2014 expect highest single-day intent",
    ],
  },
  {
    name: "Shadow Festive Peak",
    ranges: [[9, 4, 9, 7]],
    description: "Early festive sweet boxes and dry sweets with longer shelf life. Pre-festive demand building.",
    tips: [
      "Early festive sweet boxes for planners",
      "Dry sweets with longer shelf life sell well",
    ],
  },
  {
    name: "Regional Mid-Festive Windows",
    ranges: [[9, 20, 10, 2]],
    description: "Navaratri Preparations (Sep\u2013Oct).",
    tips: [
      "Sundal combos & sweets for pooja plates",
      "Sweet + salty savoury combo packs for long festival visits",
    ],
  },
  {
    name: "Diwali & Deepavali Finale",
    ranges: [[10, 31, 11, 8]],
    description: "#1 Revenue event. Laddu, Mysore Pak, Kaju sweets dominate. Nov 1 (Sunday) is peak buying day.",
    tips: [
      "Luxury gift hampers & corporate gifting",
      "Early-bird offers + online pre-order campaigns",
      "Express shipping push",
      "Nov 1 (Sunday) \u2014 peak buying day",
    ],
  },
  {
    name: "Mega Super Peak",
    ranges: [[11, 18, 11, 30]],
    description: "Compound demand: Black Friday + Wedding Season. Bulk gifting & wedding return-gift packs. High-volume dispatch.",
    tips: [
      "Bulk gifting hampers sell strong",
      "Wedding return-gift packs in demand",
      "High-volume dispatch \u2014 plan 1.5\u00D7 operations capacity",
      "Use Sunday flash upsells & bundle deals",
    ],
  },
  {
    name: "Christmas & Year-End",
    ranges: [[12, 18, 12, 25]],
    description: "Strong South India lift. Gourmet & mixed hampers for Christmas gifting.",
    tips: [
      "Gourmet & mixed hampers for gifting",
      "Tap office party bulk orders",
    ],
  },
  {
    name: "Year-End Clearance",
    ranges: [[12, 26, 12, 31]],
    description: "Clearance before year close. Move remaining inventory with aggressive discounts.",
    tips: [
      "Clearance pricing to reduce inventory before year close",
      "Combo packs to drive final orders",
    ],
  },
];

// 2026 South India Social Content Calendar
// phase: "prep" | "check" | "schedule" | "live"
const CONTENT_TASKS = [
  // JANUARY — New Year + Pongal
  { event: "New Year", phase: "prep", ranges: [[12, 10, 12, 18]], label: "Content preparation" },
  { event: "New Year", phase: "check", ranges: [[12, 19, 12, 22]], label: "Content check & approval" },
  { event: "New Year", phase: "schedule", ranges: [[12, 23, 12, 26]], label: "Content scheduling" },
  { event: "New Year", phase: "live", ranges: [[12, 27, 1, 5]], label: "Campaign live" },
  { event: "Pongal", phase: "prep", ranges: [[12, 20, 12, 30]], label: "Content preparation" },
  { event: "Pongal", phase: "check", ranges: [[1, 2, 1, 4]], label: "Content check" },
  { event: "Pongal", phase: "schedule", ranges: [[1, 5, 1, 7]], label: "Content scheduling" },
  { event: "Pongal", phase: "live", ranges: [[1, 8, 1, 17]], label: "Campaign live" },
  // FEBRUARY — Valentine's
  { event: "Valentine\u2019s", phase: "prep", ranges: [[1, 20, 1, 25]], label: "Content preparation" },
  { event: "Valentine\u2019s", phase: "check", ranges: [[1, 26, 1, 28]], label: "Content check" },
  { event: "Valentine\u2019s", phase: "schedule", ranges: [[1, 29, 1, 31]], label: "Content scheduling" },
  { event: "Valentine\u2019s", phase: "live", ranges: [[2, 1, 2, 14]], label: "Campaign live" },
  // MARCH — Ugadi
  { event: "Ugadi", phase: "prep", ranges: [[2, 25, 3, 5]], label: "Content preparation" },
  { event: "Ugadi", phase: "check", ranges: [[3, 6, 3, 8]], label: "Content check" },
  { event: "Ugadi", phase: "schedule", ranges: [[3, 9, 3, 11]], label: "Content scheduling" },
  { event: "Ugadi", phase: "live", ranges: [[3, 12, 3, 19]], label: "Campaign live" },
  // APRIL — Vishu / Tamil New Year + Summer
  { event: "Vishu / Tamil NY", phase: "prep", ranges: [[3, 15, 3, 25]], label: "Content preparation" },
  { event: "Vishu / Tamil NY", phase: "check", ranges: [[3, 26, 3, 28]], label: "Content check" },
  { event: "Vishu / Tamil NY", phase: "schedule", ranges: [[3, 29, 3, 31]], label: "Content scheduling" },
  { event: "Vishu / Tamil NY", phase: "live", ranges: [[4, 1, 4, 14]], label: "Campaign live" },
  { event: "Summer Spike", phase: "prep", ranges: [[4, 10, 4, 15]], label: "Summer content prep" },
  { event: "Summer Spike", phase: "schedule", ranges: [[4, 16, 4, 18]], label: "Summer scheduling" },
  { event: "Summer Spike", phase: "live", ranges: [[4, 19, 4, 30]], label: "Summer campaign live" },
  // MAY — Low Season (Retention)
  { event: "Retention", phase: "prep", ranges: [[4, 20, 4, 25]], label: "Content preparation" },
  { event: "Retention", phase: "check", ranges: [[4, 26, 4, 27]], label: "Content check" },
  { event: "Retention", phase: "schedule", ranges: [[4, 28, 4, 30]], label: "Content scheduling" },
  { event: "Retention", phase: "live", ranges: [[5, 1, 5, 31]], label: "Campaign live \u2014 reels, BTS, customer stories" },
  // JUNE — Mid-Year Sale
  { event: "Mid-Year EOSS", phase: "prep", ranges: [[6, 1, 6, 8]], label: "Content preparation" },
  { event: "Mid-Year EOSS", phase: "check", ranges: [[6, 9, 6, 11]], label: "Content check" },
  { event: "Mid-Year EOSS", phase: "schedule", ranges: [[6, 12, 6, 14]], label: "Content scheduling" },
  { event: "Mid-Year EOSS", phase: "live", ranges: [[6, 15, 6, 30]], label: "Campaign live" },
  // JULY — Onam Warm-Up
  { event: "Onam Warm-Up", phase: "prep", ranges: [[7, 1, 7, 10]], label: "Content preparation" },
  { event: "Onam Warm-Up", phase: "check", ranges: [[7, 11, 7, 13]], label: "Content check" },
  { event: "Onam Warm-Up", phase: "schedule", ranges: [[7, 14, 7, 15]], label: "Content scheduling" },
  { event: "Onam Warm-Up", phase: "live", ranges: [[7, 16, 7, 31]], label: "Campaign live" },
  // AUGUST — Onam Super Peak
  { event: "Onam", phase: "prep", ranges: [[7, 15, 7, 25]], label: "Content preparation" },
  { event: "Onam", phase: "check", ranges: [[7, 26, 7, 28]], label: "Content check" },
  { event: "Onam", phase: "schedule", ranges: [[7, 29, 7, 31]], label: "Content scheduling" },
  { event: "Onam", phase: "live", ranges: [[8, 1, 8, 30]], label: "Campaign live" },
  // SEPTEMBER — Early Festive
  { event: "Early Festive", phase: "prep", ranges: [[8, 15, 8, 22]], label: "Content preparation" },
  { event: "Early Festive", phase: "check", ranges: [[8, 23, 8, 25]], label: "Content check" },
  { event: "Early Festive", phase: "schedule", ranges: [[8, 26, 8, 28]], label: "Content scheduling" },
  { event: "Early Festive", phase: "live", ranges: [[8, 29, 9, 7]], label: "Campaign live" },
  // OCTOBER — Diwali Build-Up
  { event: "Diwali", phase: "prep", ranges: [[9, 15, 9, 25]], label: "Content preparation" },
  { event: "Diwali", phase: "check", ranges: [[9, 26, 9, 28]], label: "Content check" },
  { event: "Diwali", phase: "schedule", ranges: [[9, 29, 9, 30]], label: "Content scheduling" },
  { event: "Diwali", phase: "live", ranges: [[10, 1, 11, 8]], label: "Campaign live" },
  { event: "Diwali Urgency", phase: "live", ranges: [[10, 24, 10, 30]], label: "Final urgency creatives" },
  // NOVEMBER — Mega Super Peak
  { event: "Mega Peak", phase: "prep", ranges: [[10, 25, 10, 30]], label: "Content preparation" },
  { event: "Mega Peak", phase: "check", ranges: [[10, 31, 11, 2]], label: "Content check" },
  { event: "Mega Peak", phase: "schedule", ranges: [[11, 3, 11, 5]], label: "Content scheduling" },
  { event: "Mega Peak", phase: "live", ranges: [[11, 6, 11, 30]], label: "Campaign live" },
  // DECEMBER — Christmas + Year-End
  { event: "Christmas", phase: "prep", ranges: [[12, 1, 12, 5]], label: "Content preparation" },
  { event: "Christmas", phase: "check", ranges: [[12, 6, 12, 7]], label: "Content check" },
  { event: "Christmas", phase: "schedule", ranges: [[12, 8, 12, 10]], label: "Content scheduling" },
  { event: "Christmas", phase: "live", ranges: [[12, 11, 12, 31]], label: "Campaign live" },
];

const PHASE_LABELS = {
  prep: "Preparation",
  check: "Review",
  schedule: "Scheduling",
  live: "Live",
};

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
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "list"

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch("/api/ecommerce/products"),
          fetch("/api/ecommerce/orders"),
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
  }, []);

  // Load notes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) {
        setNotes(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save notes to localStorage
  const saveNotes = useCallback((updated) => {
    setNotes(updated);
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

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

  // Build content task lookup for the displayed year
  const contentByDate = useMemo(() => {
    const map = {};
    const y = currentDate.getFullYear();

    CONTENT_TASKS.forEach((task) => {
      task.ranges.forEach(([sm, sd, em, ed]) => {
        const start = new Date(y, sm - 1, sd);
        const end = new Date(y, em - 1, ed);
        const cur = new Date(start);
        while (cur <= end) {
          const key = toDateKey(cur);
          if (!map[key]) map[key] = [];
          const existing = map[key].find((t) => t.event === task.event && t.phase === task.phase);
          if (!existing) {
            map[key].push({
              event: task.event,
              phase: task.phase,
              label: task.label,
              friday: false,
            });
          }
          cur.setDate(cur.getDate() + 1);
        }
      });
    });

    // Weekly rules: Every Friday = prepare Sunday creatives
    const firstDay = new Date(y, 0, 1);
    // Find first Friday
    let fridayOffset = (5 - firstDay.getDay() + 7) % 7;
    const firstFriday = new Date(y, 0, 1 + fridayOffset);
    const yearEnd = new Date(y, 11, 31);
    const fri = new Date(firstFriday);
    while (fri <= yearEnd) {
      const key = toDateKey(fri);
      if (!map[key]) map[key] = [];
      map[key].push({
        event: "Weekly",
        phase: "prep",
        label: "Prepare Sunday creatives",
        friday: true,
      });
      fri.setDate(fri.getDate() + 7);
    }

    return map;
  }, [currentDate]);

  // Calendar grid computation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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
    let contentDays = 0;

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
    Object.keys(contentByDate).forEach((key) => {
      if (key.startsWith(monthPrefix)) contentDays++;
    });

    return { productCount, orderCount, noteCount, saleDays, contentDays };
  }, [productsByDate, ordersByDate, notes, salesByDate, contentByDate, year, month]);

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
      const dayContent = (contentByDate[key] || []).filter((t) => !t.friday);

      if (dayProducts.length || dayOrders.length || dayNotes.length || daySales.length || dayContent.length) {
        items.push({
          date,
          dateKey: key,
          products: dayProducts,
          orders: dayOrders,
          notes: dayNotes,
          sales: daySales,
          content: dayContent,
        });
      }
    }
    return items;
  }, [year, month, productsByDate, ordersByDate, notes, salesByDate, contentByDate]);

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

  // Note CRUD
  function handleAddNote() {
    if (!noteText.trim() || !selectedDate) return;
    const updated = { ...notes };
    if (!updated[selectedDate]) updated[selectedDate] = [];
    updated[selectedDate] = [...updated[selectedDate], noteText.trim()];
    saveNotes(updated);
    setNoteText("");
    setShowNoteForm(false);
  }

  function handleEditNote(index) {
    const dayNotes = notes[selectedDate] || [];
    setNoteText(dayNotes[index]);
    setEditingNoteIndex(index);
    setShowNoteForm(true);
  }

  function handleSaveEdit() {
    if (!noteText.trim() || !selectedDate || editingNoteIndex === null) return;
    const updated = { ...notes };
    const dayNotes = [...(updated[selectedDate] || [])];
    dayNotes[editingNoteIndex] = noteText.trim();
    updated[selectedDate] = dayNotes;
    saveNotes(updated);
    setNoteText("");
    setEditingNoteIndex(null);
    setShowNoteForm(false);
  }

  function handleDeleteNote(index) {
    if (!selectedDate) return;
    const updated = { ...notes };
    const dayNotes = [...(updated[selectedDate] || [])];
    dayNotes.splice(index, 1);
    if (dayNotes.length === 0) {
      delete updated[selectedDate];
    } else {
      updated[selectedDate] = dayNotes;
    }
    saveNotes(updated);
  }

  function cancelNoteForm() {
    setShowNoteForm(false);
    setEditingNoteIndex(null);
    setNoteText("");
  }

  // Selected day data
  const selectedProducts = selectedDate ? productsByDate[selectedDate] || [] : [];
  const selectedOrders = selectedDate ? ordersByDate[selectedDate] || [] : [];
  const selectedNotes = selectedDate ? notes[selectedDate] || [] : [];
  const selectedSales = selectedDate ? salesByDate[selectedDate] || [] : [];
  const selectedContent = selectedDate ? contentByDate[selectedDate] || [] : [];
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
      <div className={styles.page}>
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
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Calendar</h1>
      <p className={styles.subheading}>Product launches, orders, and content notes at a glance.</p>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats */}
      <div className={styles.statsGrid}>
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
            <div className={styles.statLabel}>Notes</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueAmber}`}>{monthStats.noteCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Content Days</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueTeal}`}>{monthStats.contentDays}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Sale Days</div>
            <span className={styles.statIconRupee}>₹</span>
          </div>
          <div className={`${styles.statValue} ${styles.statValuePurple}`}>{monthStats.saleDays}</div>
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
          <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Notes
        </span>
        <span className={styles.legendItem}>
          <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Content
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendRupee}>₹</span>
          Sales
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
                      {item.content.length > 0 && <svg className={`${styles.dot} ${styles.dotContentIcon}`} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
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
                    {item.content.map((c, i) => (
                      <div key={`content-${i}`} className={styles.listEvent}>
                        <svg className={styles.listEventIcon} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        <span className={styles.listEventName}>{c.event}: {c.label}</span>
                        <span className={styles.listEventMeta}>{PHASE_LABELS[c.phase]}</span>
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
                    {item.notes.map((note, i) => (
                      <div key={`note-${i}`} className={styles.listEvent}>
                        <svg className={styles.listEventIcon} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span className={styles.listEventName}>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
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
            const dayContent = contentByDate[key] || [];
            const hasProducts = dayProducts.length > 0;
            const hasOrders = dayOrders.length > 0;
            const hasNotes = dayNotes.length > 0;
            const hasSales = daySales.length > 0;
            const hasContent = dayContent.length > 0;
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
                {(hasProducts || hasOrders || hasNotes || hasSales || hasContent) && (
                  <div className={styles.dots}>
                    {hasSales && <span className={styles.dotRupee}>₹</span>}
                    {hasContent && <svg className={`${styles.dot} ${styles.dotContentIcon}`} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
                    {hasProducts && <svg className={`${styles.dot} ${styles.dotProductIcon}`} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
                    {hasOrders && <svg className={`${styles.dot} ${styles.dotOrderIcon}`} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
                    {hasNotes && <svg className={`${styles.dot} ${styles.dotNoteIcon}`} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                  </div>
                )}
                {(hasProducts || hasOrders || hasNotes || hasSales || hasContent) && (
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
                    {hasContent && (
                      <span className={`${styles.badge} ${styles.badgeContent}`}>
                        {dayContent.filter((c) => !c.friday).length > 0
                          ? dayContent.filter((c) => !c.friday).map((c) => `${c.event}`).filter((v, i, a) => a.indexOf(v) === i).join(" \u00B7 ")
                          : "Content prep"}
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
            {selectedProducts.length === 0 && selectedOrders.length === 0 && selectedNotes.length === 0 && selectedSales.length === 0 && selectedContent.length === 0 && !showNoteForm ? (
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

                {/* Content Tasks */}
                {selectedContent.length > 0 && (
                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionTitle}>
                      <svg className={styles.legendIcon} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Social Content Calendar
                      <span className={styles.detailSectionCount}>({selectedContent.length})</span>
                    </div>
                    {selectedContent.map((task, idx) => (
                      <div key={idx} className={styles.contentItem}>
                        <div className={styles.contentItemHeader}>
                          <span className={`${styles.contentPhase} ${styles[`contentPhase${task.phase.charAt(0).toUpperCase() + task.phase.slice(1)}`]}`}>
                            {PHASE_LABELS[task.phase]}
                          </span>
                          <span className={styles.contentEvent}>{task.event}</span>
                          {task.friday && <span className={styles.contentFriday}>Weekly</span>}
                        </div>
                        <p className={styles.contentLabel}>{task.label}</p>
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
                    <div key={idx} className={styles.noteItem}>
                      <span className={styles.noteText}>{note}</span>
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
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ResponsiveGridLayout as RGL } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  ArrowRightIcon,
  PlusIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CakeIcon,
  TrophyIcon,
  MegaphoneIcon,
  RefreshCwIcon,
  CheckIcon,
  LoaderIcon,
  GlobeIcon,
  SlidersHorizontalIcon,
  XIcon,
  LockIcon,
  UnlockIcon,
  EyeOffIcon,
} from "lucide-react";

// Width-aware responsive grid
function useWidth(ref) {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    setWidth(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

const KURALS = [
  { number: 1,   couplet: ["அகர முதல எழுத்தெல்லாம் ஆதி", "பகவன் முதற்றே உலகு."], meaning: "எழுத்துக்கெல்லாம் அகரம் முதலானது போல், உலகிற்கு இறைவன் முதலானவன்." },
  { number: 2,   couplet: ["கற்றதனால் ஆய பயனென்கொல் வாலறிவன்", "நற்றாள் தொழாஅர் எனின்."], meaning: "தூய அறிவாளனான இறைவனின் திருவடியை வணங்காவிட்டால் கற்றதனால் என்ன பயன்?" },
  { number: 4,   couplet: ["வேண்டுதல் வேண்டாமை இலானடி சேர்ந்தார்க்கு", "யாண்டும் இடும்பை இல."], meaning: "விருப்பு வெறுப்பற்ற இறைவனின் திருவடியை சேர்ந்தவர்களுக்கு எங்கும் துன்பமில்லை." },
  { number: 7,   couplet: ["தனக்குவமை இல்லாதான் தாளசைந்தார்க் கல்லால்", "மனக்கவலை மாற்றல் அரிது."], meaning: "ஒப்பற்ற இறைவனின் திருவடியை வணங்காமல் மனக்கவலையைப் போக்குவது அரிது." },
  { number: 22,  couplet: ["ஒழுக்கம் விழுப்பந் தரலான் ஒழுக்கம்", "உயிரினும் ஓம்பப் படும்."], meaning: "ஒழுக்கம் சிறப்பை அளிப்பதால், அதை உயிரையும் விட காத்துக்கொள்ள வேண்டும்." },
  { number: 32,  couplet: ["இன்னாசெய் தாரை ஒறுத்தல் அவர்நாண", "நன்னயஞ் செய்து விடல்."], meaning: "தீமை செய்தவரை தண்டிப்பதைவிட அவர் நாணும்படி நன்மை செய்துவிடுவதே சிறந்தது." },
  { number: 41,  couplet: ["அன்பும் அறனும் உடைத்தாயின் இல்வாழ்க்கை", "பண்பும் பயனும் அது."], meaning: "அன்பும் அறமும் உள்ள இல்வாழ்க்கை சிறந்த பண்பும் பயனும் உடையது." },
  { number: 55,  couplet: ["தெய்வத்தான் ஆகா தெனினும் முயற்சிதன்", "மெய்வருத்தக் கூலி தரும்."], meaning: "தெய்வ நம்பிக்கையாலும் ஆகாதென்று தோன்றினாலும், முயற்சி உழைப்பிற்கான பலனை தரும்." },
  { number: 71,  couplet: ["அன்பிற்கும் உண்டோ அடைக்குந்தாழ் ஆர்வலர்", "புன்கணீர் பூசல் தரும்."], meaning: "அன்புக்கு தடை செய்யும் தாழ்ப்பாள் உண்டோ? அன்பர்களின் கண்ணீரே அதை திறந்துவிடும்." },
  { number: 100, couplet: ["நன்றி மறப்பது நன்றன்று நன்றல்லது", "அன்றே மறப்பது நன்று."], meaning: "நன்மையை மறப்பது நல்லதல்ல; தீமையை உடனே மறப்பது நல்லது." },
  { number: 391, couplet: ["கற்க கசடறக் கற்பவை கற்றபின்", "நிற்க அதற்குத் தக."], meaning: "குற்றமற்றவற்றை கற்று, கற்றதற்கு தகுந்தவாறு வாழ வேண்டும்." },
  { number: 423, couplet: ["எப்பொருள் எத்தன்மைத் தாயினும் அப்பொருள்", "மெய்ப்பொருள் காண்பது அறிவு."], meaning: "எந்தப் பொருளும் எவ்வாறு தோன்றினாலும் அதன் உண்மையான இயல்பை காண்பதே அறிவு." },
];

// DD-MM-YYYY → Date
function parseDMY(str) {
  if (!str) return null;
  const [d, m, y] = str.split("-");
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function upcomingDateLabel(dateStr) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d - now) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDailyKural() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  return KURALS[dayOfYear % KURALS.length];
}


const LAYOUT_KEY = "dashboard_layout_v3";
const HIDDEN_KEY = "dashboard_hidden_v3";

const ALL_WIDGETS = [
  { id: "kural",         label: "Thirukkural",      static: true },
  { id: "recent",        label: "Recent Analyses" },
  { id: "domains",       label: "Domain Renewals" },
  { id: "holidays",      label: "Holidays" },
  { id: "birthdays",     label: "Birthdays" },
  { id: "anniversaries", label: "Anniversaries" },
  { id: "announcements", label: "Announcements" },
  { id: "habits",        label: "Habits" },
];

// Default layout for lg breakpoint (4 columns, each column = 1 unit)
const DEFAULT_LAYOUTS = {
  lg: [
    { i: "kural",          x: 0, y: 0, w: 4, h: 3, minW: 1, minH: 2 },
    { i: "recent",         x: 0, y: 3, w: 2, h: 4, minW: 1, minH: 2 },
    { i: "domains",        x: 2, y: 3, w: 2, h: 4, minW: 1, minH: 2 },
    { i: "holidays",       x: 0, y: 7, w: 1, h: 5, minW: 1, minH: 3 },
    { i: "birthdays",      x: 1, y: 7, w: 1, h: 5, minW: 1, minH: 3 },
    { i: "anniversaries",  x: 2, y: 7, w: 1, h: 5, minW: 1, minH: 3 },
    { i: "announcements",  x: 3, y: 7, w: 1, h: 5, minW: 1, minH: 3 },
    { i: "habits",         x: 0, y: 12, w: 4, h: 4, minW: 2, minH: 2 },
  ],
  sm: [
    { i: "kural",          x: 0, y: 0, w: 2, h: 4, minW: 1 },
    { i: "recent",         x: 0, y: 7, w: 2, h: 4, minW: 1 },
    { i: "domains",        x: 0, y: 11, w: 2, h: 4, minW: 1 },
    { i: "holidays",       x: 0, y: 15, w: 1, h: 5, minW: 1 },
    { i: "birthdays",      x: 1, y: 15, w: 1, h: 5, minW: 1 },
    { i: "anniversaries",  x: 0, y: 20, w: 1, h: 5, minW: 1 },
    { i: "announcements",  x: 1, y: 20, w: 1, h: 5, minW: 1 },
    { i: "habits",         x: 0, y: 25, w: 2, h: 4, minW: 1 },
  ],
};

const HABIT_COLORS = {
  blue:   { done: "bg-blue-500/15 border-blue-500/40",   checkBg: "bg-blue-500" },
  green:  { done: "bg-green-500/15 border-green-500/40", checkBg: "bg-green-500" },
  purple: { done: "bg-purple-500/15 border-purple-500/40", checkBg: "bg-purple-500" },
  amber:  { done: "bg-amber-500/15 border-amber-500/40", checkBg: "bg-amber-500" },
  rose:   { done: "bg-rose-500/15 border-rose-500/40",   checkBg: "bg-rose-500" },
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [domainRenewals, setDomainRenewals] = useState([]);
  const [search, setSearch] = useState("");
  const [kural, setKural] = useState(getDailyKural);
  const [habits, setHabits] = useState([]);
  const [habitsStats, setHabitsStats] = useState(null);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [hiddenWidgets, setHiddenWidgets] = useState(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []; } catch { return []; }
  });
  const [savedLayouts, setSavedLayouts] = useState(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)); } catch { return null; }
  });
  const searchRef = useRef(null);
  const gridRef = useRef(null);
  const gridWidth = useWidth(gridRef);

  function shuffleKural() {
    const next = KURALS[Math.floor(Math.random() * KURALS.length)];
    setKural(next);
  }

  async function habitAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  }

  async function loadHabits() {
    setHabitsLoading(true);
    const h = await habitAuthHeader();
    const [hr, sr] = await Promise.all([
      fetch("/api/habits", { headers: h }),
      fetch("/api/habits/stats", { headers: h }),
    ]);
    const [hj, sj] = await Promise.all([hr.json(), sr.json()]);
    setHabits(hj.habits ?? []);
    setHabitsStats(sj);
    setHabitsLoading(false);
  }

  async function toggleHabit(habitId) {
    const today = new Date().toISOString().slice(0, 10);
    const prevDone = habitsStats?.logs_today?.[habitId] ?? false;
    setHabitsStats((s) => ({ ...s, logs_today: { ...s?.logs_today, [habitId]: !prevDone } }));
    const h = await habitAuthHeader();
    const res = await fetch("/api/habits/log", { method: "POST", headers: h, body: JSON.stringify({ habit_id: habitId, log_date: today }) });
    if (!res.ok) {
      setHabitsStats((s) => ({ ...s, logs_today: { ...s?.logs_today, [habitId]: prevDone } }));
    }
  }

  // Focus search on "/"
  useEffect(() => {
    function onKey(e) {
      if (
        e.key === "/" &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { loadUpcoming(); }, []);
  useEffect(() => { loadHabits(); }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WIDGET_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setWidgetOrder(parsed);
      }
    } catch {}
  }, []);

  async function loadUpcoming() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const limit = new Date(now); limit.setDate(limit.getDate() + 30);
    const todayStr = now.toISOString().split("T")[0];
    const limitStr = limit.toISOString().split("T")[0];

    const [{ data: hols }, { data: emps }, { data: anns }] = await Promise.all([
      supabase.from("holidays").select("id, date, name").gte("date", todayStr).lte("date", limitStr).order("date"),
      supabase.from("employees").select("id, first_name, last_name, date_of_birth, date_of_joining, employee_status").neq("employee_status", "inactive"),
      supabase.from("hr_announcements").select("id, date, title, description").gte("date", todayStr).lte("date", limitStr).order("date"),
    ]);

    const events = [];

    for (const h of (hols || [])) {
      events.push({ type: "holiday", date: h.date, label: h.name, key: `h-${h.id}` });
    }
    for (const a of (anns || [])) {
      events.push({ type: "announcement", date: a.date, label: a.title, sub: a.description, key: `a-${a.id}` });
    }

    const thisYear = now.getFullYear();
    for (const emp of (emps || [])) {
      const name = `${emp.first_name} ${emp.last_name}`;
      for (const yr of [thisYear, thisYear + 1]) {
        if (emp.date_of_birth) {
          const dob = parseDMY(emp.date_of_birth);
          if (dob) {
            const bd = new Date(yr, dob.getMonth(), dob.getDate()); bd.setHours(0, 0, 0, 0);
            if (bd >= now && bd <= limit) {
              events.push({ type: "birthday", date: bd.toISOString().split("T")[0], label: name, sub: `Turns ${yr - dob.getFullYear()}`, key: `b-${emp.id}-${yr}` });
            }
          }
        }
        if (emp.date_of_joining) {
          const doj = parseDMY(emp.date_of_joining);
          if (doj && yr > doj.getFullYear()) {
            const wd = new Date(yr, doj.getMonth(), doj.getDate()); wd.setHours(0, 0, 0, 0);
            if (wd >= now && wd <= limit) {
              const yrs = yr - doj.getFullYear();
              events.push({ type: "anniversary", date: wd.toISOString().split("T")[0], label: name, sub: `${yrs} yr${yrs !== 1 ? "s" : ""}`, key: `w-${emp.id}-${yr}` });
            }
          }
        }
      }
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    setUpcomingEvents(events);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      let query = supabase
        .from("seo_analyses")
        .select("id, url, score, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      query = query.eq("user_id", data.user.id).is("team_id", null);

      query.then(({ data: analyses }) => {
        if (analyses) setRecentAnalyses(analyses);
      });

      // Load upcoming domain renewals (next 60 days)
      const todayStr = new Date().toISOString().split("T")[0];
      const sixtyDays = new Date(); sixtyDays.setDate(sixtyDays.getDate() + 60);
      const limitStr = sixtyDays.toISOString().split("T")[0];
      supabase
        .from("domain_renewals")
        .select("id, domain_name, expiry_date, registrar, auto_renew, status")
        .eq("user_id", data.user.id)
        .neq("status", "renewed")
        .lte("expiry_date", limitStr)
        .order("expiry_date")
        .limit(5)
        .then(({ data: doms }) => { if (doms) setDomainRenewals(doms); });
    });
  }, []);

  function getScoreColor(score) {
    if (score >= 70) return "text-emerald-700 dark:text-emerald-400";
    if (score >= 40) return "text-amber-700 dark:text-amber-400";
    return "text-red-700 dark:text-red-400";
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/seo?url=${encodeURIComponent(search.trim())}`);
  }

  function onLayoutChange(_, allLayouts) {
    setSavedLayouts(allLayouts);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(allLayouts));
  }

  function hideWidget(id) {
    const next = [...hiddenWidgets, id];
    setHiddenWidgets(next);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
  }

  function showWidget(id) {
    const next = hiddenWidgets.filter(w => w !== id);
    setHiddenWidgets(next);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
  }

  function resetLayout() {
    setSavedLayouts(null);
    setHiddenWidgets([]);
    localStorage.removeItem(LAYOUT_KEY);
    localStorage.removeItem(HIDDEN_KEY);
  }

  // Build layouts filtering out hidden widgets
  const activeLayouts = useMemo(() => {
    const base = savedLayouts || DEFAULT_LAYOUTS;
    const filtered = {};
    for (const bp of Object.keys(DEFAULT_LAYOUTS)) {
      const src = base[bp] || DEFAULT_LAYOUTS[bp];
      filtered[bp] = src.filter(item => !hiddenWidgets.includes(item.i));
    }
    return filtered;
  }, [savedLayouts, hiddenWidgets]);

  const hiddenList = ALL_WIDGETS.filter(w => hiddenWidgets.includes(w.id) && !w.static);

  function renderWidget(id) {
    switch (id) {
      case "recent":
        if (recentAnalyses.length === 0) return null;
        return (
          <div className="rounded-2xl border border-border bg-card p-5 h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Recent Analyses</h3>
              <Link href="/seo" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">View all <ArrowRightIcon size={12} /></Link>
            </div>
            <div className="space-y-2">
              {recentAnalyses.map((item) => (
                <Link key={item.id} href="/seo" className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <span className="text-sm truncate flex-1 mr-4">{item.url}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-semibold font-mono ${getScoreColor(item.score)}`}>{item.score}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );

      case "domains":
        if (domainRenewals.length === 0) return null;
        return (
          <div className="rounded-2xl border border-border bg-card p-5 h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <GlobeIcon size={15} className="text-blue-700 dark:text-blue-400" /> Domain Renewals
              </h3>
              <Link href="/domain-renewals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">View all <ArrowRightIcon size={12} /></Link>
            </div>
            <div className="space-y-2">
              {domainRenewals.map(d => {
                const days = Math.ceil((new Date(d.expiry_date) - new Date(new Date().toDateString())) / 86400000);
                const dayLabel = days === 0 ? "Today" : days > 0 ? `${days}d left` : `${Math.abs(days)}d overdue`;
                const dayColor = days < 0 ? "text-red-700 dark:text-red-400" : days <= 30 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground";
                return (
                  <Link key={d.id} href="/domain-renewals" className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                      <span className="text-sm font-semibold truncate">{d.domain_name}</span>
                      {d.auto_renew && <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">Auto</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-semibold ${dayColor}`}>{dayLabel}</span>
                      <span className="text-xs text-muted-foreground font-mono">{d.expiry_date}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );

      case "holidays":
        return <UpcomingCard title="Holidays"      Icon={CalendarDaysIcon} color="text-red-400"    bg="bg-red-500/10"    border="border-red-500/20"    items={upcomingEvents.filter(e => e.type === "holiday")} />;
      case "birthdays":
        return <UpcomingCard title="Birthdays"     Icon={CakeIcon}         color="text-pink-400"   bg="bg-pink-500/10"   border="border-pink-500/20"   items={upcomingEvents.filter(e => e.type === "birthday")} />;
      case "anniversaries":
        return <UpcomingCard title="Anniversaries" Icon={TrophyIcon}       color="text-violet-400" bg="bg-violet-500/10" border="border-violet-500/20" items={upcomingEvents.filter(e => e.type === "anniversary")} />;
      case "announcements":
        return <UpcomingCard title="Announcements" Icon={MegaphoneIcon}    color="text-amber-400"  bg="bg-amber-500/10"  border="border-amber-500/20"  items={upcomingEvents.filter(e => e.type === "announcement")} />;

      case "habits": {
        const habitsDone = Object.values(habitsStats?.logs_today ?? {}).filter(Boolean).length;
        const habitsPct = habits.length > 0 ? Math.round((habitsDone / habits.length) * 100) : 0;
        const pctColor = habitsPct >= 80 ? "bg-emerald-500" : habitsPct >= 50 ? "bg-amber-500" : "bg-rose-500";
        const countColor = habitsPct >= 80 ? "text-emerald-400" : habitsPct >= 50 ? "text-amber-400" : "text-muted-foreground";
        return (
          <div className="rounded-2xl border border-border bg-card p-5 h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium">Habits</h3>
                {!habitsLoading && habits.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${pctColor} transition-all duration-300`} style={{ width: `${habitsPct}%` }} />
                    </div>
                    <span className={`text-xs font-medium tabular-nums ${countColor}`}>{habitsDone}/{habits.length}</span>
                  </div>
                )}
              </div>
              <Link href="/habits" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">Open <ArrowRightIcon size={12} /></Link>
            </div>
            {habitsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <LoaderIcon size={13} className="animate-spin" /> Loading…
              </div>
            ) : habits.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No habits yet. <Link href="/habits" className="text-primary hover:underline">Add your first habit →</Link></p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {habits.map((habit) => {
                  const done = habitsStats?.logs_today?.[habit.id] ?? false;
                  const col = HABIT_COLORS[habit.color ?? "blue"];
                  return (
                    <button key={habit.id} onClick={() => toggleHabit(habit.id)}
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 ${done ? col.done : "border-border bg-card hover:bg-muted/20"}`}>
                      <span className="text-base shrink-0 leading-none">{habit.icon ?? "✅"}</span>
                      <span className="text-xs font-medium leading-snug flex-1 min-w-0 truncate">{habit.title}</span>
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? `${col.checkBg} border-transparent` : "border-border/60"}`}>
                        {done && <CheckIcon size={9} strokeWidth={3} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      default: return null;
    }
  }

  return (
    <div className="py-4">
      <style>{`
        .react-grid-item.react-grid-placeholder { background: hsl(var(--primary)); opacity: 0.08; border-radius: 1rem; }
        .react-resizable-handle {
          position: absolute !important;
          bottom: 6px !important;
          right: 6px !important;
          width: 18px !important;
          height: 18px !important;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 10;
          cursor: se-resize;
        }
        .react-resizable-handle::after {
          content: "" !important;
          position: absolute !important;
          bottom: 0 !important;
          right: 0 !important;
          width: 10px !important;
          height: 10px !important;
          border-color: hsl(var(--primary)) !important;
          border-style: solid !important;
          border-width: 0 2px 2px 0 !important;
          border-radius: 0 0 2px 0 !important;
        }
        .react-grid-item:hover .react-resizable-handle,
        .edit-mode .react-resizable-handle { opacity: 1 !important; }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {editMode && (
            <button onClick={resetLayout} className="text-[11px] text-muted-foreground hover:text-foreground border border-border px-2 py-1 rounded-md transition-colors">
              Reset Layout
            </button>
          )}
          <button
            onClick={() => setEditMode(e => !e)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${editMode ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
          >
            {editMode ? <LockIcon size={12} /> : <UnlockIcon size={12} />}
            {editMode ? "Lock" : "Customize"}
          </button>
        </div>
      </div>

      {/* ── Hidden widgets bar ── */}
      {editMode && hiddenList.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[11px] text-muted-foreground">Hidden:</span>
          {hiddenList.map(w => (
            <button key={w.id} onClick={() => showWidget(w.id)}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <PlusIcon size={10} /> {w.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Grid ── */}
      <div ref={gridRef} className={editMode ? "edit-mode" : ""}>
        <RGL
          layouts={activeLayouts}
          breakpoints={{ lg: 1024, sm: 0 }}
          cols={{ lg: 4, sm: 2 }}
          rowHeight={30}
          width={gridWidth}
          isDraggable={editMode}
          isResizable={editMode}
          onLayoutChange={onLayoutChange}
          draggableCancel=".no-drag"
          compactType="vertical"
          margin={[16, 16]}
        >
          {/* Kural */}
          {!hiddenWidgets.includes("kural") && (
            <div key="kural" className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-5 font-sans flex flex-col overflow-hidden">
              {editMode && (
                <div className="absolute top-2 right-2 z-10 no-drag">
                  <button onClick={() => hideWidget("kural")} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><EyeOffIcon size={12} /></button>
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpenIcon size={13} className="text-amber-700 dark:text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-500 tracking-wide" lang="ta">திருக்குறள்</span>
                  <button onClick={shuffleKural} className="p-0.5 rounded text-amber-600/60 hover:text-amber-600 dark:text-amber-500/60 dark:hover:text-amber-400 transition-colors no-drag"><RefreshCwIcon size={11} /></button>
                </div>
                <span className="text-[11px] text-muted-foreground border border-border/50 rounded-full px-2 py-0.5" lang="ta">குறள் {kural.number}</span>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-2 overflow-auto">
                <div className="space-y-1" lang="ta">
                  {kural.couplet.map((line, i) => (
                    <p key={i} className="text-sm font-semibold text-foreground leading-loose">{line}</p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed" lang="ta">{kural.meaning}</p>
              </div>
            </div>
          )}

          {/* Dynamic widgets */}
          {ALL_WIDGETS.filter(w => !w.static && !hiddenWidgets.includes(w.id)).map(w => {
            const content = renderWidget(w.id);
            if (!content && !editMode) return null;
            return (
              <div key={w.id} className="rounded-2xl overflow-hidden relative">
                {editMode && (
                  <div className="absolute top-2 right-2 z-10 no-drag">
                    <button onClick={() => hideWidget(w.id)} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors bg-card/80 backdrop-blur-sm"><EyeOffIcon size={12} /></button>
                  </div>
                )}
                {content || (
                  <div className="h-full rounded-2xl border border-dashed border-border bg-muted/10 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">{w.label} — no data</p>
                  </div>
                )}
              </div>
            );
          })}
        </RGL>
      </div>
    </div>
  );
}

function UpcomingCard({ title, Icon, color, bg, border, items }) {
  return (
    <div className={`rounded-2xl border ${border} bg-card p-5 flex flex-col gap-4 h-full overflow-auto`}>
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon size={15} className={color} />
        </div>
        <div>
          <p className={`text-xs font-semibold ${color}`}>{title}</p>
          <p className="text-[10px] text-muted-foreground">Next 30 days</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">None upcoming</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 6).map((ev) => {
            const label = upcomingDateLabel(ev.date);
            const isToday = label === "Today";
            return (
              <div key={ev.key} className="flex items-start gap-3">
                <span className={`text-[10px] font-mono w-[58px] shrink-0 pt-0.5 ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug truncate">{ev.label}</p>
                  {ev.sub && <p className="text-[10px] text-muted-foreground">{ev.sub}</p>}
                </div>
              </div>
            );
          })}
          {items.length > 6 && (
            <p className="text-[10px] text-muted-foreground">+{items.length - 6} more</p>
          )}
        </div>
      )}
    </div>
  );
}

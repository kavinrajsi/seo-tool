"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarDaysIcon, PlusIcon, CakeIcon, MegaphoneIcon,
  XIcon, ChevronLeftIcon, ChevronRightIcon, LoaderIcon, Trash2Icon, ListIcon,
} from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Dates are stored as DD-MM-YYYY text
function parseDMY(str) {
  if (!str) return null;
  const [d, m, y] = str.split("-");
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export default function HRCalendarPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [view, setView] = useState("list");
  const [holidays, setHolidays] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  // Add holiday
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");

  // Add announcement
  const [showAddAnn, setShowAddAnn] = useState(false);
  const [aDate, setADate] = useState("");
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");

  const [saving, setSaving] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => { load(); checkAccess(); }, []);

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: emp } = await supabase
      .from("employees").select("role, designation").eq("work_email", user.email).maybeSingle();
    if (emp && (emp.role === "admin" || emp.role === "owner" || emp.designation?.toLowerCase().includes("hr"))) {
      setCanManage(true);
    }
  }

  async function load() {
    setLoading(true);
    const [{ data: hols }, { data: emps }, { data: ann }] = await Promise.all([
      supabase.from("holidays").select("*").order("date", { ascending: true }),
      supabase.from("employees").select("id, first_name, last_name, date_of_birth, date_of_joining, employee_status, designation, department, work_email, mobile_number, blood_type, employee_number"),
      supabase.from("hr_announcements").select("*").order("date", { ascending: true }),
    ]);
    if (hols) setHolidays(hols);
    if (emps) setEmployees(emps.filter(e => e.employee_status !== "inactive"));
    if (ann) setAnnouncements(ann);
    setLoading(false);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  async function handleAddHoliday(e) {
    e.preventDefault();
    if (!hDate || !hName.trim()) return;
    setSaving(true);
    await supabase.from("holidays").insert({ date: hDate, name: hName.trim() });
    setSaving(false);
    setShowAddHoliday(false);
    setHDate(""); setHName("");
    load();
  }

  async function handleAddAnn(e) {
    e.preventDefault();
    if (!aDate || !aTitle.trim()) return;
    setSaving(true);
    await supabase.from("hr_announcements").insert({ title: aTitle.trim(), description: aDesc.trim() || null, date: aDate });
    setSaving(false);
    setShowAddAnn(false);
    setADate(""); setATitle(""); setADesc("");
    load();
  }

  async function deleteHoliday(id, name) {
    if (!confirm(`Delete holiday "${name}"?`)) return;
    await supabase.from("holidays").delete().eq("id", id);
    load();
  }

  async function deleteAnn(id) {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("hr_announcements").delete().eq("id", id);
    load();
  }

  // ── Build events map for calendar view (current month) ──────────────────
  const eventsMap = {};
  const addEv = (dateStr, ev) => {
    if (!eventsMap[dateStr]) eventsMap[dateStr] = [];
    eventsMap[dateStr].push(ev);
  };

  for (const h of holidays) {
    const d = new Date(h.date + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      addEv(h.date, { type: "holiday", label: h.name, id: h.id });
    }
  }
  for (const emp of employees) {
    const name = `${emp.first_name} ${emp.last_name}`;
    if (emp.date_of_birth) {
      const dob = parseDMY(emp.date_of_birth);
      if (dob && dob.getMonth() === month) {
        const day = dob.getDate();
        const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        addEv(ds, { type: "birthday", label: name, sub: "Birthday", empId: emp.id, dept: emp.department });
      }
    }
    if (emp.date_of_joining) {
      const doj = parseDMY(emp.date_of_joining);
      if (doj && doj.getMonth() === month) {
        const yrs = year - doj.getFullYear();
        if (yrs > 0) {
          const day = doj.getDate();
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          addEv(ds, { type: "anniversary", label: name, sub: `${yrs} yr${yrs !== 1 ? "s" : ""} at company`, empId: emp.id, dept: emp.department });
        }
      }
    }
  }
  for (const ann of announcements) {
    const d = new Date(ann.date + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      addEv(ann.date, { type: "announcement", label: ann.title, sub: ann.description, id: ann.id });
    }
  }

  // Flat sorted list for current month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today.toISOString().slice(0, 10);

  const monthEvents = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    for (const ev of eventsMap[ds] || []) monthEvents.push({ dateStr: ds, ...ev });
  }

  // ── Build year events for list view ─────────────────────────────────────
  const yearEvents = [];

  for (const h of holidays) {
    if (h.date.startsWith(`${year}-`)) {
      yearEvents.push({ dateStr: h.date, type: "holiday", label: h.name, id: h.id });
    }
  }
  for (const emp of employees) {
    const name = `${emp.first_name} ${emp.last_name}`;
    if (emp.date_of_birth) {
      const dob = parseDMY(emp.date_of_birth);
      if (dob) {
        const ds = `${year}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
        yearEvents.push({ dateStr: ds, type: "birthday", label: name, sub: "Birthday", empId: emp.id, dept: emp.department });
      }
    }
    if (emp.date_of_joining) {
      const doj = parseDMY(emp.date_of_joining);
      if (doj) {
        const yrs = year - doj.getFullYear();
        if (yrs > 0) {
          const ds = `${year}-${String(doj.getMonth() + 1).padStart(2, "0")}-${String(doj.getDate()).padStart(2, "0")}`;
          yearEvents.push({ dateStr: ds, type: "anniversary", label: name, sub: `${yrs} yr${yrs !== 1 ? "s" : ""} at company`, empId: emp.id, dept: emp.department });
        }
      }
    }
  }
  for (const ann of announcements) {
    if (ann.date.startsWith(`${year}-`)) {
      yearEvents.push({ dateStr: ann.date, type: "announcement", label: ann.title, sub: ann.description, id: ann.id });
    }
  }
  yearEvents.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  const upcomingEvents = yearEvents.filter(ev => ev.dateStr >= todayStr);

  // ── Apply filters ────────────────────────────────────────────────────────
  function applyFilters(events) {
    if (filterType === "all") return events;
    return events.filter(ev => ev.type === filterType);
  }
  const filteredUpcoming = applyFilters(upcomingEvents);
  const filteredMonth = applyFilters(monthEvents);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const chipColor = (type) => ({
    holiday:      "bg-rose-500/15 text-rose-400",
    birthday:     "bg-pink-500/15 text-pink-400",
    anniversary:  "bg-violet-500/15 text-violet-400",
    announcement: "bg-amber-500/15 text-amber-400",
  }[type]);

  const iconBgColor = (type) => ({
    holiday:      "bg-rose-500/10",
    birthday:     "bg-pink-500/10",
    anniversary:  "bg-violet-500/10",
    announcement: "bg-amber-500/10",
  }[type]);

  const EventIcon = ({ type, size = 14 }) => ({
    holiday:      <CalendarDaysIcon size={size} className="text-rose-400" />,
    birthday:     <CakeIcon size={size} className="text-pink-400" />,
    anniversary:  <span style={{ fontSize: size }}>🏆</span>,
    announcement: <MegaphoneIcon size={size} className="text-amber-400" />,
  }[type]);

  if (loading) return (
    <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>
  );

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarDaysIcon size={24} className="text-rose-400" /> HR Calendar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {view === "calendar"
              ? `${filteredMonth.length} event${filteredMonth.length !== 1 ? "s" : ""} in ${MONTHS[month]} ${year}`
              : `${filteredUpcoming.length} upcoming event${filteredUpcoming.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Legend / filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: "Holidays",      type: "holiday",      dot: "bg-rose-400",   active: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
              { label: "Birthdays",     type: "birthday",     dot: "bg-pink-400",   active: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
              { label: "Anniversaries", type: "anniversary",  dot: "bg-violet-400", active: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
              { label: "Announcements", type: "announcement", dot: "bg-amber-400",  active: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
            ].map(({ label, type, dot, active }) => {
              const isActive = filterType === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(isActive ? "all" : type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${isActive ? active : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0 inline-block`} /> {label}
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <ListIcon size={13} /> List
            </button>
            <button onClick={() => setView("calendar")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === "calendar" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <CalendarDaysIcon size={13} /> Calendar
            </button>
          </div>

          {canManage && (
            <>
              <button onClick={() => setShowAddHoliday(true)} className="flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded-lg transition-colors font-medium">
                <PlusIcon size={13} /> Holiday
              </button>
              <button onClick={() => setShowAddAnn(true)} className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg transition-colors font-medium">
                <PlusIcon size={13} /> Announcement
              </button>
            </>
          )}
        </div>
      </div>

      {view === "calendar" ? (
        <>
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-1.5 rounded-md border border-border hover:bg-muted/30 transition-colors"><ChevronLeftIcon size={16} /></button>
            <h2 className="text-sm font-semibold">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-md border border-border hover:bg-muted/30 transition-colors"><ChevronRightIcon size={16} /></button>
          </div>

          {/* Calendar grid */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} className="min-h-[90px] border-b border-r border-border/30" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvs = eventsMap[ds] || [];
                const isToday = ds === todayStr;
                const dow = new Date(year, month, day).getDay();
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <div key={day} className={`min-h-[90px] border-b border-r border-border/30 p-1.5 ${isToday ? "bg-primary/5" : ""}`}>
                    <span className={`text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : isWeekend ? "text-muted-foreground/50" : "text-foreground"}`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {dayEvs.map((ev, idx) => (
                        <div key={idx}
                          onClick={() => ev.empId && setSelectedEmployee(employees.find(e => e.id === ev.empId))}
                          className={`px-1 py-0.5 rounded text-[9px] leading-tight truncate ${chipColor(ev.type)} ${ev.empId ? "cursor-pointer hover:opacity-80" : ""}`}
                          title={`${ev.label}${ev.sub ? ` (${ev.sub})` : ""}`}>
                          {ev.label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month events list */}
          {filteredMonth.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
                Events in {MONTHS[month]} {year}
              </div>
              {filteredMonth.map((ev, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 ${i < filteredMonth.length - 1 ? "border-b border-border/50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg ${iconBgColor(ev.type)} flex items-center justify-center shrink-0`}>
                      <EventIcon type={ev.type} />
                    </div>
                    <div>
                      <p
                        onClick={() => ev.empId && setSelectedEmployee(employees.find(e => e.id === ev.empId))}
                        className={`text-sm font-medium ${ev.empId ? "cursor-pointer hover:underline" : ""}`}
                      >{ev.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(ev.dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        {ev.sub ? ` · ${ev.sub}` : ""}
                      </p>
                    </div>
                  </div>
                  {canManage && ev.type === "holiday" && (
                    <button onClick={() => deleteHoliday(ev.id, ev.label)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                  )}
                  {canManage && ev.type === "announcement" && (
                    <button onClick={() => deleteAnn(ev.id)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
              No events in {MONTHS[month]} {year}.
            </div>
          )}
        </>
      ) : (
        /* List view */
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {filteredUpcoming.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No upcoming events.</div>
            ) : (
              filteredUpcoming.map((ev, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors ${i < filteredUpcoming.length - 1 ? "border-b border-border/50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg ${iconBgColor(ev.type)} flex items-center justify-center shrink-0`}>
                        <EventIcon type={ev.type} />
                      </div>
                      <div>
                        <p
                          onClick={() => ev.empId && setSelectedEmployee(employees.find(e => e.id === ev.empId))}
                          className={`text-sm font-medium ${ev.empId ? "cursor-pointer hover:underline" : ""}`}
                        >{ev.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(ev.dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                          {ev.sub ? ` · ${ev.sub}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${chipColor(ev.type)}`}>
                        {ev.type}
                      </span>
                      {canManage && ev.type === "holiday" && (
                        <button onClick={() => deleteHoliday(ev.id, ev.label)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                      )}
                      {canManage && ev.type === "announcement" && (
                        <button onClick={() => deleteAnn(ev.id)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                      )}
                    </div>
                  </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Add Holiday Drawer */}
      {showAddHoliday && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAddHoliday(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">Add Holiday</h2>
              <button onClick={() => setShowAddHoliday(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <form onSubmit={handleAddHoliday} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date *</label>
                <input type="date" value={hDate} onChange={e => setHDate(e.target.value)} required
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 text-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Holiday Name *</label>
                <input type="text" value={hName} onChange={e => setHName(e.target.value)} required autoFocus
                  placeholder="e.g. Republic Day"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60" />
              </div>
              <div className="mt-auto pt-4">
                <button type="submit" disabled={saving || !hDate || !hName.trim()}
                  className="w-full flex items-center justify-center gap-1.5 text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                  {saving ? <LoaderIcon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
                  {saving ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Add Announcement Drawer */}
      {showAddAnn && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAddAnn(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">Add Announcement</h2>
              <button onClick={() => setShowAddAnn(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <form onSubmit={handleAddAnn} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date *</label>
                <input type="date" value={aDate} onChange={e => setADate(e.target.value)} required
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 text-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title *</label>
                <input type="text" value={aTitle} onChange={e => setATitle(e.target.value)} required autoFocus
                  placeholder="e.g. Quarterly All-Hands Meeting"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea value={aDesc} onChange={e => setADesc(e.target.value)} rows={3}
                  placeholder="Optional details..."
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
              </div>
              <div className="mt-auto pt-4">
                <button type="submit" disabled={saving || !aDate || !aTitle.trim()}
                  className="w-full flex items-center justify-center gap-1.5 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                  {saving ? <LoaderIcon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
                  {saving ? "Adding..." : "Add Announcement"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Employee Card Drawer */}
      {selectedEmployee && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedEmployee(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">Employee</h2>
              <button onClick={() => setSelectedEmployee(null)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
                <XIcon size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Avatar + name */}
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                  {selectedEmployee.designation && <p className="text-xs text-muted-foreground">{selectedEmployee.designation}</p>}
                  {selectedEmployee.department && <p className="text-xs text-muted-foreground">{selectedEmployee.department}</p>}
                </div>
              </div>

              {/* Details */}
              <div className="rounded-xl border border-border overflow-hidden">
                {[
                  { label: "Employee ID",    value: selectedEmployee.employee_number },
                  { label: "Work Email",     value: selectedEmployee.work_email },
                  { label: "Mobile",         value: selectedEmployee.mobile_number },
                  { label: "Date of Birth",  value: selectedEmployee.date_of_birth },
                  { label: "Date of Joining",value: selectedEmployee.date_of_joining },
                  { label: "Blood Type",     value: selectedEmployee.blood_type },
                ].filter(r => r.value).map((row, i, arr) => (
                  <div key={row.label} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-border/50" : ""}`}>
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

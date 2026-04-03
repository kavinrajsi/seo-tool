"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarDaysIcon, PlusIcon, Trash2Icon, XIcon, ChevronLeftIcon, ChevronRightIcon,
} from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [view, setView] = useState("calendar");
  const [showAdd, setShowAdd] = useState(false);
  const [fDate, setFDate] = useState("");
  const [fName, setFName] = useState("");
  const [saving, setSaving] = useState(false);

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
    const { data } = await supabase.from("holidays").select("*").order("date", { ascending: true });
    if (data) setHolidays(data);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!fDate || !fName.trim()) return;
    setSaving(true);
    await supabase.from("holidays").insert({ date: fDate, name: fName.trim() });
    setSaving(false);
    setShowAdd(false);
    setFDate(""); setFName("");
    load();
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete holiday "${name}"?`)) return;
    await supabase.from("holidays").delete().eq("id", id);
    load();
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const yearHolidays = holidays.filter((h) => h.date.startsWith(`${year}-`));
  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const holidayMap = {};
  for (const h of holidays) {
    if (!holidayMap[h.date]) holidayMap[h.date] = [];
    holidayMap[h.date].push(h);
  }

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarDaysIcon size={24} className="text-rose-400" /> Holiday Calendar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{yearHolidays.length} holidays in {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("calendar")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "calendar" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Calendar</button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>List</button>
          </div>
          {canManage && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded-lg transition-colors font-medium">
              <PlusIcon size={13} /> Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Year filter */}
      <div className="flex items-center gap-2">
        {[2022, 2023, 2024, 2025, 2026].map((y) => (
          <button key={y} onClick={() => setYear(y)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${year === y ? "bg-rose-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            {y}
          </button>
        ))}
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
              {DAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/30" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayHolidays = holidayMap[dateStr] || [];
                const isToday = dateStr === today;
                const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
                return (
                  <div key={day} className={`min-h-[80px] border-b border-r border-border/30 p-1.5 ${isToday ? "bg-primary/5" : ""}`}>
                    <span className={`text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : isWeekend ? "text-muted-foreground/50" : "text-foreground"}`}>
                      {day}
                    </span>
                    {dayHolidays.map((h) => (
                      <div key={h.id} className="mt-0.5 px-1 py-0.5 rounded bg-rose-500/15 text-rose-400 text-[9px] leading-tight truncate" title={h.name}>
                        {h.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month holidays list below calendar */}
          {monthHolidays.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
                Holidays in {MONTHS[month]} {year}
              </div>
              {monthHolidays.map((h, i) => (
                <div key={h.id} className={`flex items-center justify-between px-4 py-3 ${i < monthHolidays.length - 1 ? "border-b border-border/50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-rose-400">{new Date(h.date).getDate()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>
                  {canManage && (
                    <button onClick={() => handleDelete(h.id, h.name)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* List view */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[100px_1fr_120px_60px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Date</span>
            <span>Holiday</span>
            <span>Day</span>
            <span></span>
          </div>
          {yearHolidays.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No holidays for {year}.</div>
          ) : (
            yearHolidays.map((h, i) => {
              const d = new Date(h.date);
              const isPast = h.date < today;
              return (
                <div key={h.id} className={`grid grid-cols-[100px_1fr_120px_60px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors ${i < yearHolidays.length - 1 ? "border-b border-border/50" : ""} ${isPast ? "opacity-50" : ""}`}>
                  <span className="text-xs font-mono text-muted-foreground">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <span className="text-sm font-medium">{h.name}</span>
                  <span className="text-xs text-muted-foreground">{d.toLocaleDateString("en-US", { weekday: "long" })}</span>
                  <div>
                    {canManage && (
                      <button onClick={() => handleDelete(h.id, h.name)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add holiday drawer */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAdd(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">Add Holiday</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date *</label>
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 text-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Holiday Name *</label>
                <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} required autoFocus
                  placeholder="e.g. Republic Day"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60" />
              </div>
              <div className="mt-auto pt-4">
                <button type="submit" disabled={saving || !fDate || !fName.trim()}
                  className="w-full flex items-center justify-center gap-1.5 text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                  {saving ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

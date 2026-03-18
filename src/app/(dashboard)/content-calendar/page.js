"use client";

import { useState } from "react";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
} from "lucide-react";

const PLATFORMS = ["All", "Instagram", "YouTube", "Pinterest", "Substack", "Twitter"];

const PLATFORM_COLORS = {
  Instagram: "bg-pink-900/60 text-pink-300 border-pink-800",
  YouTube: "bg-red-900/60 text-red-300 border-red-800",
  Pinterest: "bg-rose-900/60 text-rose-300 border-rose-800",
  Substack: "bg-orange-900/60 text-orange-300 border-orange-800",
  Twitter: "bg-sky-900/60 text-sky-300 border-sky-800",
};

const MOCK_CONTENT = [
  { id: 1, title: "Product launch reel", platform: "Instagram", date: "2026-03-05", posted: true },
  { id: 2, title: "Tutorial video", platform: "YouTube", date: "2026-03-07", posted: true },
  { id: 3, title: "Mood board pin", platform: "Pinterest", date: "2026-03-07", posted: true },
  { id: 4, title: "Customer story", platform: "Instagram", date: "2026-03-10", posted: true },
  { id: 5, title: "Industry news thread", platform: "Twitter", date: "2026-03-12", posted: true },
  { id: 6, title: "Tips carousel", platform: "Instagram", date: "2026-03-14", posted: true },
  { id: 7, title: "Q&A livestream", platform: "YouTube", date: "2026-03-18", posted: false },
  { id: 8, title: "Weekly newsletter", platform: "Substack", date: "2026-03-18", posted: false },
  { id: 9, title: "Poll & engagement", platform: "Twitter", date: "2026-03-20", posted: false },
  { id: 10, title: "Collaboration post", platform: "Instagram", date: "2026-03-22", posted: false },
  { id: 11, title: "Infographic pin", platform: "Pinterest", date: "2026-03-22", posted: false },
  { id: 12, title: "Monthly recap", platform: "YouTube", date: "2026-03-25", posted: false },
  { id: 13, title: "Flash sale announcement", platform: "Instagram", date: "2026-03-28", posted: false },
  { id: 14, title: "Meme post", platform: "Twitter", date: "2026-03-28", posted: false },
  { id: 15, title: "Deep-dive essay", platform: "Substack", date: "2026-03-30", posted: false },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthData(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = (first.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = last.getDate();
  return { startDay, daysInMonth };
}

export default function ContentCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [platform, setPlatform] = useState("All");

  const { startDay, daysInMonth } = getMonthData(year, month);
  const monthName = new Date(year, month).toLocaleString("en-US", { month: "long", year: "numeric" });

  const filtered = platform === "All"
    ? MOCK_CONTENT
    : MOCK_CONTENT.filter((c) => c.platform === platform);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  function getContentForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filtered.filter((c) => c.date === dateStr);
  }

  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and view content across all platforms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                platform === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-md p-2 hover:bg-accent transition-colors">
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-medium">{monthName}</h2>
        <button onClick={nextMonth} className="rounded-md p-2 hover:bg-accent transition-colors">
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {/* Empty leading cells */}
          {Array.from({ length: startDay }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-28 border-b border-r border-border/50 p-2 bg-card/50" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const content = getContentForDay(day);
            const isToday = isCurrentMonth && day === today;
            return (
              <div
                key={day}
                className={`min-h-28 border-b border-r border-border/50 p-2 hover:bg-accent/30 transition-colors ${
                  isToday ? "bg-primary/5" : ""
                }`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                }`}>
                  {day}
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {content.map((item) => (
                    <div
                      key={item.id}
                      className={`truncate rounded px-1.5 py-0.5 text-[11px] leading-tight border ${
                        PLATFORM_COLORS[item.platform]
                      } ${item.posted ? "opacity-60" : ""}`}
                      title={`${item.title} (${item.platform})${item.posted ? " — Posted" : ""}`}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pink-400" /> Instagram
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" /> YouTube
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" /> Pinterest
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-400" /> Substack
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" /> Twitter
        </span>
        <span className="ml-auto">Faded = already posted</span>
      </div>
    </div>
  );
}

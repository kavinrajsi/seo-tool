"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "../../ecommerce/calendar/calendar.module.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EmployeeCalendarPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("calendar");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    async function loadEmployees() {
      setLoading(true);
      try {
        const res = await fetch(`/api/employees`);
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || []);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    loadEmployees();
  }, []);

  // Build birthday lookup for the displayed year
  const birthdaysByDate = useMemo(() => {
    const map = {};
    employees.forEach((emp) => {
      if (!emp.date_of_birth) return;
      const dob = new Date(emp.date_of_birth + "T00:00:00");
      const bdayThisYear = new Date(year, dob.getMonth(), dob.getDate());
      const key = toDateKey(bdayThisYear);
      if (!map[key]) map[key] = [];
      const age = year - dob.getFullYear();
      map[key].push({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        age,
        date_of_birth: emp.date_of_birth,
      });
    });
    return map;
  }, [employees, year]);

  // Build work anniversary lookup for the displayed year
  const anniversariesByDate = useMemo(() => {
    const map = {};
    employees.forEach((emp) => {
      if (!emp.date_of_joining) return;
      const doj = new Date(emp.date_of_joining + "T00:00:00");
      // Only show anniversaries if employee joined in a previous year
      if (doj.getFullYear() >= year) return;
      const annivThisYear = new Date(year, doj.getMonth(), doj.getDate());
      const key = toDateKey(annivThisYear);
      if (!map[key]) map[key] = [];
      const years = year - doj.getFullYear();
      map[key].push({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        years,
        date_of_joining: emp.date_of_joining,
      });
    });
    return map;
  }, [employees, year]);

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const days = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, outside: true });
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

  const today = toDateKey(new Date());
  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Stats for current month
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    let birthdayCount = 0;
    let anniversaryCount = 0;

    Object.keys(birthdaysByDate).forEach((key) => {
      if (key.startsWith(monthPrefix)) birthdayCount += birthdaysByDate[key].length;
    });
    Object.keys(anniversariesByDate).forEach((key) => {
      if (key.startsWith(monthPrefix)) anniversaryCount += anniversariesByDate[key].length;
    });

    return { birthdayCount, anniversaryCount };
  }, [birthdaysByDate, anniversariesByDate, year, month]);

  // List view data
  const listViewData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = toDateKey(date);
      const dayBirthdays = birthdaysByDate[key] || [];
      const dayAnniversaries = anniversariesByDate[key] || [];

      if (dayBirthdays.length || dayAnniversaries.length) {
        items.push({
          date,
          dateKey: key,
          birthdays: dayBirthdays,
          anniversaries: dayAnniversaries,
        });
      }
    }
    return items;
  }, [year, month, birthdaysByDate, anniversariesByDate]);

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
  }

  // Selected day data
  const selectedBirthdays = selectedDate ? birthdaysByDate[selectedDate] || [] : [];
  const selectedAnniversaries = selectedDate ? anniversariesByDate[selectedDate] || [] : [];
  const selectedDateFormatted = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

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
        <div style={b("180px", "28px", "0.5rem")} />
        <div style={b("340px", "14px", "1.5rem")} />
        <div className={styles.statsGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[1, 2, 3].map((i) => (
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
      <h1 className={styles.heading}>Employee Calendar</h1>
      <p className={styles.subheading}>Birthdays and work anniversaries at a glance.</p>

      {/* Stats */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Total Employees</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueAccent}`}>{employees.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Birthdays This Month</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-3-3.87" /><path d="M4 21v-2a4 4 0 0 1 3-3.87" /><circle cx="12" cy="7" r="4" /><path d="M12 3v-1" /><path d="M10 3h4" /></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValuePurple}`}>{monthStats.birthdayCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statLabel}>Anniversaries This Month</div>
            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </div>
          <div className={`${styles.statValue} ${styles.statValueBlue}`}>{monthStats.anniversaryCount}</div>
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
          <span className={styles.legendDot} style={{ background: "#f472b6" }} />
          Birthdays
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#3b82f6" }} />
          Work Anniversaries
        </span>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className={styles.listContainer}>
          {listViewData.length === 0 ? (
            <div className={styles.emptyDetail}>No birthdays or anniversaries this month.</div>
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
                      {item.birthdays.length > 0 && <span className={styles.listEventDot} style={{ background: "#f472b6" }} />}
                      {item.anniversaries.length > 0 && <span className={styles.listEventDot} style={{ background: "#3b82f6" }} />}
                    </div>
                  </div>
                  <div className={styles.listDayEvents}>
                    {item.birthdays.map((b) => (
                      <div key={`bday-${b.id}`} className={styles.listEvent}>
                        <span className={styles.listEventDot} style={{ background: "#f472b6" }} />
                        <span className={styles.listEventName}>{b.name}</span>
                        <span className={styles.listEventMeta}>Turns {b.age}</span>
                      </div>
                    ))}
                    {item.anniversaries.map((a) => (
                      <div key={`anniv-${a.id}`} className={styles.listEvent}>
                        <span className={styles.listEventDot} style={{ background: "#3b82f6" }} />
                        <span className={styles.listEventName}>{a.name}</span>
                        <span className={styles.listEventMeta}>{a.years} year{a.years !== 1 ? "s" : ""}</span>
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
              const isToday2 = key === today;
              const isSelected = key === selectedDate;
              const dayBirthdays = birthdaysByDate[key] || [];
              const dayAnniversaries = anniversariesByDate[key] || [];
              const hasBirthdays = dayBirthdays.length > 0;
              const hasAnniversaries = dayAnniversaries.length > 0;

              let cellClass = styles.dayCell;
              if (day.outside) cellClass += ` ${styles.dayCellOutside}`;
              if (isToday2) cellClass += ` ${styles.dayCellToday}`;
              if (isSelected) cellClass += ` ${styles.dayCellSelected}`;

              return (
                <div key={idx} className={cellClass} onClick={() => selectDay(key)}>
                  <div className={styles.dayNumber}>
                    {isToday2 ? (
                      <span className={styles.dayNumberToday}>{day.date.getDate()}</span>
                    ) : (
                      day.date.getDate()
                    )}
                  </div>
                  {(hasBirthdays || hasAnniversaries) && (
                    <div className={styles.dots}>
                      {hasBirthdays && <span className={styles.dot} style={{ background: "#f472b6" }} />}
                      {hasAnniversaries && <span className={styles.dot} style={{ background: "#3b82f6" }} />}
                    </div>
                  )}
                  {(hasBirthdays || hasAnniversaries) && (
                    <div className={styles.badges}>
                      {hasBirthdays && (
                        <span className={styles.badge} style={{ background: "rgba(244, 114, 182, 0.12)", color: "#f472b6" }}>
                          {dayBirthdays.length} birthday{dayBirthdays.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {hasAnniversaries && (
                        <span className={styles.badge} style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}>
                          {dayAnniversaries.length} anniv.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              {selectedBirthdays.length === 0 && selectedAnniversaries.length === 0 ? (
                <div className={styles.emptyDetail}>No birthdays or anniversaries on this day.</div>
              ) : (
                <>
                  {/* Birthdays */}
                  {selectedBirthdays.length > 0 && (
                    <div className={styles.detailSection}>
                      <div className={styles.detailSectionTitle}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-3-3.87" /><path d="M4 21v-2a4 4 0 0 1 3-3.87" /><circle cx="12" cy="7" r="4" /><path d="M12 3v-1" /><path d="M10 3h4" /></svg>
                        Birthdays
                        <span className={styles.detailSectionCount}>({selectedBirthdays.length})</span>
                      </div>
                      {selectedBirthdays.map((b) => (
                        <div key={b.id} className={styles.saleItem} style={{ borderLeftColor: "#f472b6" }}>
                          <div className={styles.saleItemHeader}>
                            <span className={styles.saleIcon} style={{ color: "#f472b6" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </span>
                            <span className={styles.saleName}>{b.name}</span>
                            <span style={{
                              fontSize: "0.675rem", fontWeight: 600, textTransform: "uppercase",
                              padding: "0.125rem 0.5rem", borderRadius: "9999px",
                              background: "rgba(244, 114, 182, 0.15)", color: "#f472b6",
                              marginLeft: "auto", whiteSpace: "nowrap"
                            }}>
                              Turns {b.age}
                            </span>
                          </div>
                          <p className={styles.saleDescription}>
                            Born on {new Date(b.date_of_birth + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Anniversaries */}
                  {selectedAnniversaries.length > 0 && (
                    <div className={styles.detailSection}>
                      <div className={styles.detailSectionTitle}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        Work Anniversaries
                        <span className={styles.detailSectionCount}>({selectedAnniversaries.length})</span>
                      </div>
                      {selectedAnniversaries.map((a) => (
                        <div key={a.id} className={styles.saleItem} style={{ borderLeftColor: "#3b82f6" }}>
                          <div className={styles.saleItemHeader}>
                            <span className={styles.saleIcon} style={{ color: "#3b82f6" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </span>
                            <span className={styles.saleName}>{a.name}</span>
                            <span style={{
                              fontSize: "0.675rem", fontWeight: 600, textTransform: "uppercase",
                              padding: "0.125rem 0.5rem", borderRadius: "9999px",
                              background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6",
                              marginLeft: "auto", whiteSpace: "nowrap"
                            }}>
                              {a.years} year{a.years !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className={styles.saleDescription}>
                            Joined on {new Date(a.date_of_joining + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  UserCheckIcon, SearchIcon, CalendarIcon, ClockIcon,
  CheckCircle2Icon, CircleIcon,
} from "lucide-react";

const ONBOARDING_TASKS = [
  { key: "welcome_email",     label: "Welcome email sent",              category: "Communication" },
  { key: "email_account",     label: "Work email account created",      category: "IT Setup" },
  { key: "laptop_assigned",   label: "Laptop / equipment assigned",     category: "IT Setup" },
  { key: "tools_access",      label: "Tools & software access granted", category: "IT Setup" },
  { key: "office_tour",       label: "Office tour completed",           category: "Orientation" },
  { key: "induction",         label: "Induction meeting done",          category: "Orientation" },
  { key: "team_intro",        label: "Team introduction done",          category: "Orientation" },
  { key: "offer_letter",      label: "Offer letter signed",             category: "Documents" },
  { key: "id_proof",          label: "ID proof collected",              category: "Documents" },
  { key: "address_proof",     label: "Address proof collected",         category: "Documents" },
  { key: "bank_details",      label: "Bank account details collected",  category: "Documents" },
  { key: "pan_aadhaar",       label: "PAN & Aadhaar number recorded",   category: "Documents" },
  { key: "id_card",           label: "ID card issued",                  category: "Documents" },
  { key: "payroll_added",     label: "Added to payroll",                category: "Finance" },
  { key: "emergency_contact", label: "Emergency contact recorded",      category: "HR Data" },
  { key: "policy_ack",        label: "HR policy acknowledged",          category: "HR Data" },
];

const CATEGORIES = [...new Set(ONBOARDING_TASKS.map((t) => t.category))];

const CATEGORY_COLORS = {
  Communication: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "IT Setup":    "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Orientation:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Documents:     "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Finance:       "text-green-400 bg-green-500/10 border-green-500/20",
  "HR Data":     "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function daysAgo(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

export default function Onboarding() {
  const [employees, setEmployees] = useState([]);
  const [checklists, setChecklists] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const { data: emps } = await supabase
      .from("employees")
      .select("id, first_name, last_name, designation, department, date_of_joining, work_email")
      .gte("date_of_joining", since.toISOString().slice(0, 10))
      .order("date_of_joining", { ascending: false });

    if (emps) {
      setEmployees(emps);
      setSelected((prev) => prev ?? (emps[0] || null));

      const ids = emps.map((e) => e.id);
      if (ids.length > 0) {
        const { data: tasks } = await supabase
          .from("onboarding_checklist")
          .select("employee_id, task_key")
          .in("employee_id", ids)
          .eq("completed", true);

        if (tasks) {
          const map = {};
          for (const t of tasks) {
            if (!map[t.employee_id]) map[t.employee_id] = new Set();
            map[t.employee_id].add(t.task_key);
          }
          setChecklists(map);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleTask(employeeId, taskKey) {
    const current = checklists[employeeId] ?? new Set();
    const isComplete = current.has(taskKey);
    const next = new Set(current);
    isComplete ? next.delete(taskKey) : next.add(taskKey);

    setChecklists((prev) => ({ ...prev, [employeeId]: next }));
    setSaving(taskKey);

    if (isComplete) {
      await supabase
        .from("onboarding_checklist")
        .delete()
        .eq("employee_id", employeeId)
        .eq("task_key", taskKey);
    } else {
      await supabase
        .from("onboarding_checklist")
        .upsert({ employee_id: employeeId, task_key: taskKey, completed: true, completed_at: new Date().toISOString() });
    }
    setSaving(null);
  }

  const filtered = employees.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  const completedCount = employees.filter(
    (e) => (checklists[e.id]?.size ?? 0) === ONBOARDING_TASKS.length
  ).length;

  const groupedTasks = CATEGORIES.map((cat) => ({
    category: cat,
    tasks: ONBOARDING_TASKS.filter((t) => t.category === cat),
  }));

  return (
    <div className="flex flex-1 min-h-0 -mx-4 -mb-4 overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-80 border-r border-border flex flex-col shrink-0 bg-card">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <UserCheckIcon size={15} className="text-primary" />
            <h1 className="font-semibold text-sm">Onboarding</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
              <p className="text-base font-bold">{employees.length}</p>
              <p className="text-[10px] text-muted-foreground">New Hires</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
              <p className="text-base font-bold text-emerald-400">{completedCount}</p>
              <p className="text-[10px] text-muted-foreground">Complete</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
              <p className="text-base font-bold text-amber-400">{employees.length - completedCount}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
          </div>

          <div className="relative">
            <SearchIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-10">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">No recent hires found.</div>
          ) : (
            filtered.map((emp) => {
              const done = checklists[emp.id]?.size ?? 0;
              const pct = Math.round((done / ONBOARDING_TASKS.length) * 100);
              const isSelected = selected?.id === emp.id;
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelected(emp)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/20 hover:bg-muted/30 transition-colors ${
                    isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium truncate">{emp.first_name} {emp.last_name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{pct}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1.5">{emp.department}</p>
                    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-400" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel — checklist ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {selected ? (
          <>
            {/* Employee header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                    {selected.first_name?.[0]}{selected.last_name?.[0]}
                  </div>
                  <div>
                    <h2 className="font-semibold text-base">{selected.first_name} {selected.last_name}</h2>
                    <p className="text-xs text-muted-foreground">{selected.designation} · {selected.department}</p>
                  </div>
                </div>
                {(() => {
                  const done = checklists[selected.id]?.size ?? 0;
                  const pct = Math.round((done / ONBOARDING_TASKS.length) * 100);
                  return (
                    <div className="text-right shrink-0">
                      <p className={`text-xl font-bold ${pct === 100 ? "text-emerald-400" : ""}`}>{pct}%</p>
                      <p className="text-xs text-muted-foreground">{done} / {ONBOARDING_TASKS.length} tasks</p>
                    </div>
                  );
                })()}
              </div>
              {(() => {
                const done = checklists[selected.id]?.size ?? 0;
                const pct = Math.round((done / ONBOARDING_TASKS.length) * 100);
                return (
                  <div className="mt-3 w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-400" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Info row */}
            <div className="px-6 py-2.5 border-b border-border flex items-center gap-5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarIcon size={11} />
                <span>
                  Joined{" "}
                  {selected.date_of_joining
                    ? new Date(selected.date_of_joining).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon size={11} />
                <span>
                  {selected.date_of_joining ? `${daysAgo(selected.date_of_joining)} days ago` : "—"}
                </span>
              </div>
              {selected.work_email && (
                <span className="text-muted-foreground">{selected.work_email}</span>
              )}
            </div>

            {/* Checklist */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {groupedTasks.map(({ category, tasks }) => {
                const doneInCat = tasks.filter((t) => checklists[selected.id]?.has(t.key)).length;
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[category]}`}>
                        {category}
                      </span>
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-[10px] text-muted-foreground">{doneInCat}/{tasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {tasks.map((task) => {
                        const isComplete = checklists[selected.id]?.has(task.key) ?? false;
                        return (
                          <button
                            key={task.key}
                            onClick={() => toggleTask(selected.id, task.key)}
                            disabled={saving === task.key}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                              isComplete
                                ? "border-emerald-500/20 bg-emerald-500/5"
                                : "border-border/60 hover:bg-muted/30"
                            }`}
                          >
                            {isComplete
                              ? <CheckCircle2Icon size={15} className="text-emerald-400 shrink-0" />
                              : <CircleIcon size={15} className="text-muted-foreground/40 shrink-0" />
                            }
                            <span className={`text-sm flex-1 ${isComplete ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {task.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <UserCheckIcon size={48} className="opacity-20" />
            <p className="text-sm">Select an employee to view their onboarding checklist</p>
          </div>
        )}
      </div>
    </div>
  );
}

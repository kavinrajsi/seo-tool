"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { NetworkIcon, XIcon, BuildingIcon, UsersIcon } from "lucide-react";

function Avatar({ first, last, size = "md" }) {
  const sz = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-16 w-16 text-xl",
  }[size];
  return (
    <div className={`${sz} rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 ring-2 ring-background`}>
      {first?.[0]}{last?.[0]}
    </div>
  );
}

function EmpDrawer({ emp, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold">Employee</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
            <XIcon size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 py-2">
            <Avatar first={emp.first_name} last={emp.last_name} size="lg" />
            <div className="text-center">
              <p className="text-base font-semibold">{emp.first_name} {emp.last_name}</p>
              {emp.designation && <p className="text-xs text-muted-foreground mt-0.5">{emp.designation}</p>}
              {emp.department && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{emp.department}</p>}
            </div>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            {[
              { label: "Employee ID",     value: emp.employee_number },
              { label: "Work Email",      value: emp.work_email },
              { label: "Mobile",          value: emp.mobile_number },
              { label: "Date of Joining", value: emp.date_of_joining },
              { label: "Blood Type",      value: emp.blood_type },
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
  );
}

export default function OrgChartPage() {
  const [tab, setTab] = useState("departments");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name, designation, department, work_email, mobile_number, date_of_joining, blood_type, employee_number, employee_status")
      .order("first_name");
    if (data) setEmployees(data.filter(e => e.employee_status !== "inactive"));
    setLoading(false);
  }

  const filtered = search.trim()
    ? employees.filter(e =>
        `${e.first_name} ${e.last_name} ${e.designation} ${e.department}`
          .toLowerCase().includes(search.toLowerCase()))
    : employees;

  // Group by department — named depts first, unassigned last
  const deptMap = {};
  for (const emp of filtered) {
    const d = emp.department?.trim() || "";
    if (!deptMap[d]) deptMap[d] = [];
    deptMap[d].push(emp);
  }
  const namedDepts = Object.keys(deptMap).filter(Boolean).sort();
  const unassigned = deptMap[""] || [];

  if (loading) return (
    <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>
  );

  return (
    <div className="flex flex-1 flex-col gap-0 py-4">

      {/* CSS tree connectors */}
      <style>{`
        .tree-ul {
          display: flex;
          justify-content: center;
          gap: 16px;
          list-style: none;
          padding: 0;
          margin: 0;
          position: relative;
        }
        .tree-li {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding-top: 28px;
        }
        /* Vertical line from horizontal bar down to node */
        .tree-li::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 1px;
          height: 28px;
          background-color: hsl(var(--border));
        }
        /* Horizontal bar segment for each sibling */
        .tree-li:not(:only-child)::after {
          content: '';
          position: absolute;
          top: 0;
          height: 1px;
          background-color: hsl(var(--border));
        }
        .tree-li:first-child:not(:only-child)::after { left: calc(50% + 1px); right: -8px; }
        .tree-li:last-child:not(:only-child)::after  { right: calc(50% + 1px); left: -8px; }
        .tree-li:not(:first-child):not(:last-child)::after { left: -8px; right: -8px; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <NetworkIcon size={24} className="text-primary" /> Org Chart
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {employees.length} employees · {namedDepts.length} department{namedDepts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search employees..."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 w-52"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border mb-6">
        {[["employees", "Employees"], ["departments", "Departments"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "employees" ? (
        /* ── Employee directory grid ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(emp => (
            <button key={emp.id} onClick={() => setSelectedEmp(emp)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all shadow-sm group text-center">
              <Avatar first={emp.first_name} last={emp.last_name} size="lg" />
              <div>
                <p className="text-xs font-semibold group-hover:text-primary transition-colors leading-snug">
                  {emp.first_name} {emp.last_name}
                </p>
                {emp.designation && <p className="text-[10px] text-muted-foreground mt-0.5">{emp.designation}</p>}
                {emp.department && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{emp.department}</p>}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-16 text-center text-sm text-muted-foreground">No employees found.</p>
          )}
        </div>
      ) : (
        /* ── Department org tree ── */
        <div className="overflow-x-auto pb-8">
          {namedDepts.length === 0 && unassigned.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No data found.</p>
          ) : (
            <div className="flex flex-col items-center min-w-max mx-auto px-6 pt-2">

              {namedDepts.length > 0 ? (
                <>
                  {/* Departments row */}
                  <ul className="tree-ul" style={{ gap: "32px" }}>
                    {namedDepts.map(dept => (
                      <li key={dept} className="tree-li" style={{ paddingTop: 28 }}>

                        {/* Dept node */}
                        <div className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border border-border bg-card shadow-sm w-48">
                          <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                            <BuildingIcon size={18} className="text-blue-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold leading-tight">{dept}</p>
                            <span className="inline-block mt-1 text-[10px] font-medium bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full">
                              {deptMap[dept].length} {deptMap[dept].length === 1 ? "member" : "members"}
                            </span>
                          </div>
                        </div>

                        {/* Vertical connector dept → employees */}
                        <div className="w-px h-7 bg-border" />

                        {/* Employee nodes */}
                        <ul className="tree-ul" style={{ gap: "12px" }}>
                          {deptMap[dept].map(emp => (
                            <li key={emp.id} className="tree-li" style={{ paddingTop: 24 }}>
                              <button
                                onClick={() => setSelectedEmp(emp)}
                                className="flex flex-col items-center gap-2 px-3 py-3 rounded-2xl border border-border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all shadow-sm w-36 group"
                              >
                                <Avatar first={emp.first_name} last={emp.last_name} />
                                <div className="text-center">
                                  <p className="text-[11px] font-semibold leading-tight group-hover:text-primary transition-colors">
                                    {emp.first_name} {emp.last_name}
                                  </p>
                                  {emp.designation && (
                                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{emp.designation}</p>
                                  )}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>

                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center mb-4">
                  No departments assigned yet. Add department names to employees to see the org tree.
                </p>
              )}

              {/* Unassigned employees summary */}
              {unassigned.length > 0 && (
                <div className={`flex flex-col items-center ${namedDepts.length > 0 ? "mt-10" : ""}`}>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
                    <UsersIcon size={13} />
                    {unassigned.length} employee{unassigned.length !== 1 ? "s" : ""} without a department
                    <span className="text-[10px] text-muted-foreground/60">— assign departments in Employees page</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl">
                    {unassigned.slice(0, 12).map(emp => (
                      <button key={emp.id} onClick={() => setSelectedEmp(emp)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all shadow-sm group">
                        <Avatar first={emp.first_name} last={emp.last_name} size="sm" />
                        <span className="text-[11px] font-medium group-hover:text-primary transition-colors">
                          {emp.first_name} {emp.last_name}
                        </span>
                      </button>
                    ))}
                    {unassigned.length > 12 && (
                      <span className="flex items-center px-3 py-1.5 text-[11px] text-muted-foreground">
                        +{unassigned.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {selectedEmp && <EmpDrawer emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}
    </div>
  );
}

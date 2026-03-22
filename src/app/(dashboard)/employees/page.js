"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  UsersIcon,
  SearchIcon,
  ExternalLinkIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  XIcon,
  BriefcaseIcon,
  CalendarIcon,
} from "lucide-react";

const STATUS_COLORS = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setEmployees(data);
      setLoading(false);
    })();
  }, []);

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];

  const filtered = employees.filter((e) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !`${e.first_name} ${e.last_name}`.toLowerCase().includes(s) &&
        !e.work_email?.toLowerCase().includes(s) &&
        !e.employee_number?.toLowerCase().includes(s) &&
        !e.department?.toLowerCase().includes(s)
      ) return false;
    }
    if (deptFilter !== "all" && e.department !== deptFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UsersIcon size={24} className="text-emerald-400" />
            Employees
          </h1>
          <p className="text-muted-foreground mt-1">{employees.length} employees</p>
        </div>
        <a href="/employees/register" className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors">
          + Register New
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by name, email, ID, or department..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        {departments.length > 0 && (
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none">
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <UsersIcon size={28} />
          <p className="text-sm">{employees.length === 0 ? "No employees registered yet." : "No matching employees."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_100px_80px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Employee</span>
            <span>Department</span>
            <span>Joining Date</span>
            <span>Status</span>
            <span className="text-right">ID</span>
          </div>
          {filtered.map((emp, i) => (
            <div key={emp.id} onClick={() => setSelected(emp)} className={`grid grid-cols-[1fr_140px_120px_100px_80px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{emp.first_name} {emp.middle_name ? emp.middle_name + " " : ""}{emp.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{emp.work_email}</p>
              </div>
              <span className="text-xs text-muted-foreground truncate">{emp.department || "—"}</span>
              <span className="text-xs text-muted-foreground">{emp.date_of_joining || "—"}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[emp.employee_status] || STATUS_COLORS.active}`}>
                {emp.employee_status || "active"}
              </span>
              <span className="text-xs text-muted-foreground text-right font-mono">{emp.employee_number || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">{selected.first_name} {selected.middle_name ? selected.middle_name + " " : ""}{selected.last_name}</h2>
                <p className="text-xs text-muted-foreground">{selected.designation || selected.department || "Employee"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {selected.work_email && (
                  <a href={`mailto:${selected.work_email}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><MailIcon size={10} /> Work Email</p>
                    <p className="text-sm font-medium truncate">{selected.work_email}</p>
                  </a>
                )}
                {selected.personal_email && (
                  <a href={`mailto:${selected.personal_email}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><MailIcon size={10} /> Personal Email</p>
                    <p className="text-sm font-medium truncate">{selected.personal_email}</p>
                  </a>
                )}
                {selected.mobile_number && (
                  <a href={`tel:${selected.mobile_number}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><PhoneIcon size={10} /> Mobile</p>
                    <p className="text-sm font-medium">{selected.mobile_number}</p>
                  </a>
                )}
                {selected.mobile_number_secondary && (
                  <a href={`tel:${selected.mobile_number_secondary}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><PhoneIcon size={10} /> Emergency</p>
                    <p className="text-sm font-medium">{selected.mobile_number_secondary}</p>
                  </a>
                )}
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><BriefcaseIcon size={10} /> Department</p>
                  <p className="text-sm font-medium">{selected.department || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><CalendarIcon size={10} /> Joined</p>
                  <p className="text-sm font-medium">{selected.date_of_joining || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Gender</p>
                  <p className="text-sm font-medium">{selected.gender || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">DOB</p>
                  <p className="text-sm font-medium">{selected.date_of_birth || "—"}</p>
                </div>
              </div>

              {(selected.personal_address_line_1 || selected.personal_city) && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><MapPinIcon size={10} /> Address</p>
                  <p className="text-sm font-medium">
                    {[selected.personal_address_line_1, selected.personal_address_line_2, selected.personal_city, selected.personal_state, selected.personal_postal_code].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">PAN</p>
                  <p className="text-sm font-medium font-mono">{selected.pan_number || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Aadhaar</p>
                  <p className="text-sm font-medium font-mono">{selected.aadhaar_number || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Blood Type</p>
                  <p className="text-sm font-medium">{selected.blood_type || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Shirt Size</p>
                  <p className="text-sm font-medium">{selected.shirt_size || "—"}</p>
                </div>
              </div>

              {selected.employee_number && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Employee ID</p>
                  <p className="text-sm font-medium font-mono">{selected.employee_number}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UsersIcon,
  SearchIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  XIcon,
  BriefcaseIcon,
  CalendarIcon,
  PencilIcon,
  SaveIcon,
  CheckIcon,
  ArrowUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";

const STATUS_COLORS = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const EDITABLE_FIELDS = [
  { key: "first_name", label: "First Name", type: "text" },
  { key: "middle_name", label: "Middle Name", type: "text" },
  { key: "last_name", label: "Last Name", type: "text" },
  { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
  { key: "date_of_birth", label: "Date of Birth", type: "text" },
  { key: "work_email", label: "Work Email", type: "email" },
  { key: "personal_email", label: "Personal Email", type: "email" },
  { key: "mobile_number", label: "Mobile", type: "tel" },
  { key: "mobile_number_secondary", label: "Emergency Contact", type: "tel" },
  { key: "employee_number", label: "Employee ID", type: "text" },
  { key: "date_of_joining", label: "Joining Date", type: "text" },
  { key: "designation", label: "Designation", type: "text" },
  { key: "department", label: "Department", type: "text" },
  { key: "employee_type", label: "Employee Type", type: "select", options: ["employee", "intern", "contract"] },
  { key: "employee_status", label: "Status", type: "select", options: ["", "inactive"] },
  { key: "date_of_exit", label: "Exit Date", type: "text" },
  { key: "role", label: "Role", type: "select", options: ["user", "admin"] },
  { key: "personal_address_line_1", label: "Address Line 1", type: "text" },
  { key: "personal_address_line_2", label: "Address Line 2", type: "text" },
  { key: "personal_city", label: "City", type: "text" },
  { key: "personal_state", label: "State", type: "text" },
  { key: "personal_postal_code", label: "Postal Code", type: "text" },
  { key: "pan_number", label: "PAN", type: "text" },
  { key: "aadhaar_number", label: "Aadhaar", type: "text" },
  { key: "blood_type", label: "Blood Type", type: "text" },
  { key: "shirt_size", label: "Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
];

function EditableField({ field, value, onChange }) {
  if (field.type === "select") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
      >
        {field.options.map((o) => (
          <option key={o} value={o}>{o || "Active"}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={field.type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
    />
  );
}

export default function Employees() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortCol, setSortCol] = useState("status");
  const [sortDir, setSortDir] = useState("asc");

  function handleSort(col) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [inlineEdit, setInlineEdit] = useState(null); // { id, field, value }
  const [departmentList, setDepartmentList] = useState([]);

  useEffect(() => {
    loadEmployees();
    supabase.from("departments").select("name").order("name").then(({ data }) => {
      if (data) setDepartmentList(data.map((d) => d.name));
    });
  }, []);

  async function loadEmployees() {
    const { data } = await supabase.from("employees").select("*");
    if (data) {
      const active = data
        .filter((e) => e.employee_status !== "inactive")
        .sort((a, b) => (a.date_of_joining || "").localeCompare(b.date_of_joining || ""));
      const inactive = data
        .filter((e) => e.employee_status === "inactive")
        .sort((a, b) => (a.date_of_exit || "").localeCompare(b.date_of_exit || ""));
      setEmployees([...active, ...inactive]);
    }
    setLoading(false);
  }

  function openEmployee(emp) {
    router.push(`/employees/${emp.id}`);
  }

  function startEdit() {
    setEditing(true);
    setMsg("");
  }

  function cancelEdit() {
    setEditing(false);
    setEditData({ ...selected });
    setMsg("");
  }

  async function saveEdit() {
    setSaving(true);
    setMsg("");
    const { id, created_at, ...updateData } = editData;
    const { error } = await supabase
      .from("employees")
      .update(updateData)
      .eq("id", selected.id);

    if (error) {
      setMsg("Error: " + error.message);
    } else {
      setMsg("Saved");
      setSelected(editData);
      setEditing(false);
      loadEmployees();
    }
    setSaving(false);
  }

  async function saveInlineEdit() {
    if (!inlineEdit) return;
    const { id, field, value } = inlineEdit;
    await supabase.from("employees").update({ [field]: value }).eq("id", id);
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));
    setInlineEdit(null);
  }

  function startInlineEdit(e, emp, field) {
    e.stopPropagation();
    setInlineEdit({ id: emp.id, field, value: emp[field] || "" });
  }

  const departments = departmentList.length > 0 ? departmentList : [...new Set(employees.map((e) => e.department).filter(Boolean))];

  const filtered = employees
    .filter((e) => {
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
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortCol) {
        case "name":
          return dir * `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case "dept":
          return dir * (a.department || "").localeCompare(b.department || "");
        case "joining":
          return dir * (a.date_of_joining || "").localeCompare(b.date_of_joining || "");
        case "dob":
          return dir * (a.date_of_birth || "").localeCompare(b.date_of_birth || "");
        case "status":
        default: {
          const aInactive = a.employee_status === "inactive" ? 1 : 0;
          const bInactive = b.employee_status === "inactive" ? 1 : 0;
          if (aInactive !== bInactive) return dir * (aInactive - bInactive);
          return (a.date_of_joining || "").localeCompare(b.date_of_joining || "");
        }
      }
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
          <input type="text" placeholder="Search by name, email, ID, or department..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
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
          <div className="grid grid-cols-[1fr_140px_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
            {[
              { label: "Employee",   col: "name"    },
              { label: "Department", col: "dept"    },
              { label: "Joined",     col: "joining" },
              { label: "DOB",        col: "dob"     },
              { label: "Status",     col: "status"  },
            ].map(({ label, col }) => (
              <button
                key={col}
                onClick={() => handleSort(col)}
                className="flex items-center gap-1 hover:text-foreground transition-colors w-fit"
              >
                {label}
                {sortCol === col
                  ? sortDir === "asc"
                    ? <ChevronUpIcon size={12} className="text-primary" />
                    : <ChevronDownIcon size={12} className="text-primary" />
                  : <ArrowUpDownIcon size={11} className="opacity-40" />
                }
              </button>
            ))}
          </div>
          {filtered.map((emp, i) => (
            <div key={emp.id} onClick={() => openEmployee(emp)} className={`grid grid-cols-[1fr_140px_100px_100px_80px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{emp.first_name} {emp.middle_name && emp.middle_name !== "-" ? emp.middle_name + " " : ""}{emp.last_name}</p>
                  {emp.employee_number && <span className="text-[10px] text-muted-foreground font-mono shrink-0">{emp.employee_number}</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{emp.work_email}</p>
              </div>
              <span className="text-xs text-muted-foreground truncate">{emp.department || "—"}</span>
              {inlineEdit?.id === emp.id && inlineEdit.field === "date_of_joining" ? (
                <input
                  autoFocus
                  type="text"
                  value={inlineEdit.value}
                  onChange={(e) => setInlineEdit((prev) => ({ ...prev, value: e.target.value }))}
                  onBlur={saveInlineEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setInlineEdit(null); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded border border-primary/50 bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              ) : (
                <span onClick={(e) => startInlineEdit(e, emp, "date_of_joining")} className="text-xs text-muted-foreground cursor-text hover:text-foreground hover:bg-muted/30 rounded px-1.5 py-0.5 -mx-1.5 transition-colors">{emp.date_of_joining || "—"}</span>
              )}
              {inlineEdit?.id === emp.id && inlineEdit.field === "date_of_birth" ? (
                <input
                  autoFocus
                  type="text"
                  value={inlineEdit.value}
                  onChange={(e) => setInlineEdit((prev) => ({ ...prev, value: e.target.value }))}
                  onBlur={saveInlineEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setInlineEdit(null); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded border border-primary/50 bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              ) : (
                <span onClick={(e) => startInlineEdit(e, emp, "date_of_birth")} className="text-xs text-muted-foreground cursor-text hover:text-foreground hover:bg-muted/30 rounded px-1.5 py-0.5 -mx-1.5 transition-colors">{emp.date_of_birth || "—"}</span>
              )}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const newStatus = emp.employee_status === "inactive" ? "" : "inactive";
                  await supabase.from("employees").update({ employee_status: newStatus }).eq("id", emp.id);
                  setEmployees((prev) => prev.map((x) => x.id === emp.id ? { ...x, employee_status: newStatus } : x));
                }}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit cursor-pointer hover:opacity-70 transition-opacity ${STATUS_COLORS[emp.employee_status] || STATUS_COLORS.active}`}
                title={emp.employee_status === "inactive" ? "Mark as active" : "Mark as inactive"}
              >
                {emp.employee_status || "active"}
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

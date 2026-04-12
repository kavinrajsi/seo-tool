"use client";

import { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UserIcon, MailIcon, PhoneIcon, MapPinIcon, BriefcaseIcon, CalendarIcon,
  PencilIcon, SaveIcon, CheckIcon, ArrowLeftIcon, LoaderIcon, XIcon,
} from "lucide-react";

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
  { key: "bank_account_name", label: "Bank Account Name", type: "text" },
  { key: "bank_account_number", label: "Bank Account Number", type: "text" },
  { key: "bank_ifsc_code", label: "IFSC Code", type: "text" },
  { key: "bank_name", label: "Bank Name", type: "text" },
  { key: "bank_branch", label: "Bank Branch", type: "text" },
];

const TYPE_COLORS = {
  employee: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  intern: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  contract: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const STATUS_COLORS = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function EmployeeDetailPage({ params }) {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center py-16"><LoaderIcon size={20} className="animate-spin text-muted-foreground" /></div>}>
      <EmployeeDetail params={params} />
    </Suspense>
  );
}

function EmployeeDetail({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
      if (data) {
        setEmployee(data);
        setEditData({ ...data });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <LoaderIcon size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 gap-3">
        <UserIcon size={32} className="text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Employee not found</p>
        <button onClick={() => router.push("/employees")} className="text-sm text-primary hover:underline">Back to Employees</button>
      </div>
    );
  }

  function startEdit() { setEditing(true); setMsg(""); }
  function cancelEdit() { setEditing(false); setEditData({ ...employee }); setMsg(""); }

  async function saveEdit() {
    setSaving(true);
    setMsg("");
    const { id: _, created_at, ...updateData } = editData;
    const { error } = await supabase.from("employees").update(updateData).eq("id", employee.id);
    if (error) {
      setMsg("Error: " + error.message);
    } else {
      setMsg("Saved");
      setEmployee(editData);
      setEditing(false);
    }
    setSaving(false);
  }

  const status = employee.employee_status || "active";
  const empType = employee.employee_type || "employee";

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/employees")} className="p-2 rounded-md border border-border hover:bg-muted transition-colors">
            <ArrowLeftIcon size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {employee.first_name} {employee.middle_name && employee.middle_name !== "-" ? employee.middle_name + " " : ""}{employee.last_name}
              </h1>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[empType]}`}>
                {empType}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
                {status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {employee.designation || employee.department || "Employee"} {employee.employee_number ? `· ${employee.employee_number}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <SaveIcon size={14} /> {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={cancelEdit} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
            </>
          ) : (
            <button onClick={startEdit} className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
              <PencilIcon size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`px-3 py-2 rounded-md text-xs flex items-center gap-1 ${msg.startsWith("Error") ? "bg-red-500/10 text-red-400 border border-red-500/30" : "bg-green-500/10 text-green-400 border border-green-500/30"}`}>
          {!msg.startsWith("Error") && <CheckIcon size={12} />} {msg}
        </div>
      )}

      {editing ? (
        /* Edit mode */
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EDITABLE_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">{field.label}</label>
                {field.type === "select" ? (
                  <select
                    value={editData[field.key] || ""}
                    onChange={(e) => setEditData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                  >
                    {field.options.map((o) => (
                      <option key={o} value={o}>{o || "Active"}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={editData[field.key] || ""}
                    onChange={(e) => setEditData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* View mode */
        <>
          {/* Contact Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MailIcon size={16} className="text-muted-foreground" /> Contact Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {employee.work_email && (
                <a href={`mailto:${employee.work_email}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                  <p className="text-[10px] text-muted-foreground mb-1">Work Email</p>
                  <p className="text-sm font-medium truncate">{employee.work_email}</p>
                </a>
              )}
              {employee.personal_email && (
                <a href={`mailto:${employee.personal_email}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                  <p className="text-[10px] text-muted-foreground mb-1">Personal Email</p>
                  <p className="text-sm font-medium truncate">{employee.personal_email}</p>
                </a>
              )}
              {employee.mobile_number && (
                <a href={`tel:${employee.mobile_number}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                  <p className="text-[10px] text-muted-foreground mb-1">Mobile</p>
                  <p className="text-sm font-medium">{employee.mobile_number}</p>
                </a>
              )}
              {employee.mobile_number_secondary && (
                <a href={`tel:${employee.mobile_number_secondary}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                  <p className="text-[10px] text-muted-foreground mb-1">Emergency</p>
                  <p className="text-sm font-medium">{employee.mobile_number_secondary}</p>
                </a>
              )}
            </div>
          </div>

          {/* Employment Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BriefcaseIcon size={16} className="text-muted-foreground" /> Employment Information
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <InfoCard label="Department" value={employee.department} />
              <InfoCard label="Designation" value={employee.designation} />
              <InfoCard label="Employee Type" value={empType} capitalize />
              <InfoCard label="Date of Joining" value={employee.date_of_joining} />
              <InfoCard label="Employee ID" value={employee.employee_number} mono />
              <InfoCard label="Role" value={employee.role} capitalize />
              {employee.employee_status === "inactive" && <InfoCard label="Exit Date" value={employee.date_of_exit} />}
            </div>
          </div>

          {/* Personal Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <UserIcon size={16} className="text-muted-foreground" /> Personal Information
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <InfoCard label="Gender" value={employee.gender} />
              <InfoCard label="Date of Birth" value={employee.date_of_birth} />
              <InfoCard label="Blood Type" value={employee.blood_type} />
              <InfoCard label="Shirt Size" value={employee.shirt_size} />
              <InfoCard label="PAN" value={employee.pan_number} mono />
              <InfoCard label="Aadhaar" value={employee.aadhaar_number} mono />
            </div>
          </div>

          {/* Address */}
          {(employee.personal_address_line_1 || employee.personal_city) && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <MapPinIcon size={16} className="text-muted-foreground" /> Address
              </h2>
              <p className="text-sm">
                {[employee.personal_address_line_1, employee.personal_address_line_2, employee.personal_city, employee.personal_state, employee.personal_postal_code].filter(Boolean).join(", ")}
              </p>
            </div>
          )}

          {/* Bank Details */}
          {(employee.bank_account_name || employee.bank_account_number) && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BriefcaseIcon size={16} className="text-muted-foreground" /> Bank Details
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoCard label="Account Name" value={employee.bank_account_name} />
                <InfoCard label="Account Number" value={employee.bank_account_number} mono />
                <InfoCard label="IFSC Code" value={employee.bank_ifsc_code} mono />
                <InfoCard label="Bank Name" value={employee.bank_name} />
                <InfoCard label="Branch" value={employee.bank_branch} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InfoCard({ label, value, mono, capitalize }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}>{value || "—"}</p>
    </div>
  );
}

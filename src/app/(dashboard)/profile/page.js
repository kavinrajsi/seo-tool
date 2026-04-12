"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UserIcon,
  MailIcon,
  CalendarIcon,
  LogOutIcon,
  KeyIcon,
  ShieldIcon,
  PhoneIcon,
  BriefcaseIcon,
  MapPinIcon,
  FileTextIcon,
  PencilIcon,
  SaveIcon,
  XIcon,
  LoaderIcon,
  UploadIcon,
  FileIcon,
  PlusIcon,
  Trash2Icon,
  BuildingIcon,
  WalletIcon,
  LandmarkIcon,
} from "lucide-react";

// Generate a signed URL (valid 1 hour) for private bucket files
async function getSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("employee-documents")
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_TYPES = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "Other"];
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const EDITABLE_SECTIONS = {
  personal: {
    title: "Personal Information",
    icon: UserIcon,
    fields: [
      { key: "first_name", label: "First Name" },
      { key: "middle_name", label: "Middle Name" },
      { key: "last_name", label: "Last Name" },
      { key: "gender", label: "Gender", type: "select", options: GENDERS },
      { key: "date_of_birth", label: "Date of Birth", placeholder: "DD-MM-YYYY" },
    ],
  },
  contact: {
    title: "Contact Information",
    icon: PhoneIcon,
    fields: [
      { key: "personal_email", label: "Personal Email", type: "email" },
      { key: "mobile_number", label: "Mobile Number", placeholder: "10-digit number" },
      { key: "mobile_number_secondary", label: "Emergency Contact", placeholder: "10-digit number" },
    ],
  },
  address: {
    title: "Address Information",
    icon: MapPinIcon,
    fields: [
      { key: "personal_address_line_1", label: "Address Line 1" },
      { key: "personal_address_line_2", label: "Address Line 2" },
      { key: "personal_city", label: "City" },
      { key: "personal_state", label: "State" },
      { key: "personal_postal_code", label: "Postal Code" },
    ],
  },
  additional: {
    title: "Additional Information",
    icon: ShieldIcon,
    fields: [
      { key: "pan_number", label: "PAN Number", placeholder: "ABCDE1234F" },
      { key: "aadhaar_number", label: "Aadhaar Number", placeholder: "12-digit number" },
      { key: "blood_type", label: "Blood Type", type: "select", options: BLOOD_TYPES },
      { key: "shirt_size", label: "Shirt Size", type: "select", options: SHIRT_SIZES },
    ],
  },
  bank: {
    title: "Bank Details",
    icon: LandmarkIcon,
    fields: [
      { key: "bank_account_name", label: "Name as per Bank" },
      { key: "bank_account_number", label: "Account Number" },
      { key: "bank_ifsc_code", label: "IFSC Code", placeholder: "e.g. SBIN0001234" },
      { key: "bank_name", label: "Bank Name" },
      { key: "bank_branch", label: "Branch" },
    ],
  },
};

// Read-only fields the user should not edit themselves
function getEmploymentFields(departments, designations) {
  return {
    title: "Employment Information",
    icon: BriefcaseIcon,
    fields: [
      { key: "employee_number", label: "Employee ID" },
      { key: "date_of_joining", label: "Date of Joining", placeholder: "DD-MM-YYYY" },
      { key: "designation", label: "Designation", type: "select", options: designations },
      { key: "department", label: "Department", type: "select", options: departments },
      { key: "employee_type", label: "Employee Type", type: "select", options: ["employee", "intern", "contract"] },
      { key: "work_email", label: "Work Email", type: "email" },
      { key: "role", label: "Role", type: "select", options: ["user", "admin", "owner", "hr", "finance"] },
      { key: "employee_status", label: "Status", type: "select", options: ["active", "inactive"] },
    ],
  };
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || <span className="text-muted-foreground italic">Not provided</span>}</p>
    </div>
  );
}

function EditableInput({ value, onChange, type, placeholder, options }) {
  if (type === "select") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
      >
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input
      type={type || "text"}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
    />
  );
}

const ROLE_BADGE = {
  admin:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  member: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  viewer: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  owner:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  user:   "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function formatMonth(val) {
  if (!val) return "—";
  const [y, m] = val.split("-");
  if (!m) return val;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1] || m} ${y}`;
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(null); // section key being edited
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  // Signed URLs for private documents
  const [signedUrls, setSignedUrls] = useState({});

  async function resolveSignedUrl(key, path) {
    if (!path) return;
    const url = await getSignedUrl(path);
    if (url) setSignedUrls((prev) => ({ ...prev, [key]: url }));
  }

  // Document re-upload
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docMsg, setDocMsg] = useState("");
  const [docError, setDocError] = useState("");
  // Work history
  const [workHistory, setWorkHistory] = useState([]);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [workForm, setWorkForm] = useState({ company_name: "", from_year: "", to_year: "", role: "" });
  const [workFiles, setWorkFiles] = useState({ offer: null, experience: null, relieving: null });
  const [savingWork, setSavingWork] = useState(false);
  const [workError, setWorkError] = useState("");
  // Payslips
  const [payslips, setPayslips] = useState([]);
  const [showPayslipForm, setShowPayslipForm] = useState(false);
  const [payslipForm, setPayslipForm] = useState({ document_type: "payslip", month_label: "" });
  const [payslipFile, setPayslipFile] = useState(null);
  const [savingPayslip, setSavingPayslip] = useState(false);
  const [payslipError, setPayslipError] = useState("");

  // Department & designation lists
  const [departmentList, setDepartmentList] = useState([]);
  const [designationList, setDesignationList] = useState([]);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUser(data.user);

      const { data: emp } = await supabase
        .from("employees")
        .select("*")
        .eq("work_email", data.user.email)
        .maybeSingle();
      if (emp) {
        setEmployee(emp);
        if (emp.role === "admin" || emp.role === "owner" || emp.role === "hr") setIsAdmin(true);

        // Resolve signed URLs for employee documents
        const docUrls = {};
        for (const [key, path] of Object.entries({ pan: emp.pan_card_url, aadhaar: emp.aadhaar_card_url, resume: emp.resume_url })) {
          if (path) {
            const url = await getSignedUrl(path);
            if (url) docUrls[key] = url;
          }
        }
        setSignedUrls(docUrls);

        const { data: wh } = await supabase
          .from("employee_work_history")
          .select("*")
          .eq("employee_id", emp.id)
          .order("from_year", { ascending: false });
        if (wh) {
          setWorkHistory(wh);
          // Resolve signed URLs for work history documents
          for (const w of wh) {
            for (const [suffix, path] of Object.entries({ offer: w.offer_letter_url, experience: w.experience_letter_url, relieving: w.relieving_letter_url })) {
              if (path) {
                const url = await getSignedUrl(path);
                if (url) docUrls[`wh_${w.id}_${suffix}`] = url;
              }
            }
          }
        }

        const { data: ps } = await supabase
          .from("employee_payslips")
          .select("*")
          .eq("employee_id", emp.id)
          .order("created_at", { ascending: false });
        if (ps) {
          setPayslips(ps);
          for (const p of ps) {
            if (p.file_url) {
              const url = await getSignedUrl(p.file_url);
              if (url) docUrls[`ps_${p.id}`] = url;
            }
          }
        }

        setSignedUrls(docUrls);
      }

      // Load department and designation lists
      supabase.from("departments").select("name").order("name").then(({ data }) => {
        if (data) setDepartmentList(data.map((d) => d.name));
      });
      supabase.from("employees").select("designation").not("designation", "is", null).then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((d) => d.designation).filter(Boolean))].sort();
          setDesignationList(unique);
        }
      });

      setLoading(false);
    }
    load();
  }, []);

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMsg("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  }

  const EMPLOYMENT_SECTION = getEmploymentFields(departmentList, designationList);

  function startEditing(sectionKey) {
    const section = sectionKey === "employment" ? EMPLOYMENT_SECTION : EDITABLE_SECTIONS[sectionKey];
    const data = {};
    section.fields.forEach((f) => { data[f.key] = employee[f.key] || ""; });
    setEditData(data);
    setEditing(sectionKey);
    setSaveMsg("");
    setSaveError("");
  }

  function cancelEditing() {
    setEditing(null);
    setEditData({});
    setSaveError("");
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setSaveMsg("");

    const { error } = await supabase
      .from("employees")
      .update(editData)
      .eq("id", employee.id);

    if (error) {
      setSaveError(error.message);
    } else {
      setEmployee((prev) => ({ ...prev, ...editData }));
      setSaveMsg("Saved successfully.");
      setEditing(null);
      setEditData({});
    }
    setSaving(false);
  }

  async function handleDocUpload(type) {
    const fileMap = { pan: panFile, aadhaar: aadhaarFile, resume: resumeFile };
    const file = fileMap[type];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setDocError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDocError("File must be under 5 MB.");
      return;
    }

    setUploadingDocs(true);
    setDocError("");
    setDocMsg("");

    // Delete old file from storage if exists
    const columnMap = { pan: "pan_card_url", aadhaar: "aadhaar_card_url", resume: "resume_url" };
    const oldPath = employee[columnMap[type]];
    if (oldPath) {
      await supabase.storage.from("employee-documents").remove([oldPath]);
    }

    const ext = file.name.split(".").pop();
    const prefixMap = { pan: "pan-cards", aadhaar: "aadhaar-cards", resume: "resumes" };
    const path = `${prefixMap[type]}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("employee-documents")
      .upload(path, file, { contentType: "application/pdf" });

    if (uploadErr) {
      setDocError(uploadErr.message);
      setUploadingDocs(false);
      return;
    }

    const column = columnMap[type];
    const { error: updateErr } = await supabase
      .from("employees")
      .update({ [column]: path })
      .eq("id", employee.id);

    if (updateErr) {
      setDocError(updateErr.message);
    } else {
      setEmployee((prev) => ({ ...prev, [column]: path }));
      const url = await getSignedUrl(path);
      if (url) setSignedUrls((prev) => ({ ...prev, [type]: url }));
      const labelMap = { pan: "PAN card", aadhaar: "Aadhaar card", resume: "Resume" };
      setDocMsg(`${labelMap[type]} updated.`);
      if (type === "pan") setPanFile(null);
      else if (type === "aadhaar") setAadhaarFile(null);
      else setResumeFile(null);
    }
    setUploadingDocs(false);
  }

  async function uploadToStorage(file, prefix) {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("employee-documents").upload(path, file, { contentType: "application/pdf" });
    if (error) throw new Error(error.message);
    return path;
  }

  async function handleAddWork() {
    if (!workForm.company_name.trim() || !workForm.from_year.trim() || !workForm.to_year.trim() || !workForm.role.trim()) {
      setWorkError("Company name, from year, to year, and role are required.");
      return;
    }
    setSavingWork(true);
    setWorkError("");

    try {
      let offer_letter_url = null, experience_letter_url = null, relieving_letter_url = null;
      if (workFiles.offer) offer_letter_url = await uploadToStorage(workFiles.offer, "work-offer-letters");
      if (workFiles.experience) experience_letter_url = await uploadToStorage(workFiles.experience, "work-experience-letters");
      if (workFiles.relieving) relieving_letter_url = await uploadToStorage(workFiles.relieving, "work-relieving-letters");

      const { data, error } = await supabase
        .from("employee_work_history")
        .insert({
          employee_id: employee.id,
          company_name: workForm.company_name.trim(),
          from_year: workForm.from_year.trim(),
          to_year: workForm.to_year.trim(),
          role: workForm.role.trim(),
          offer_letter_url,
          experience_letter_url,
          relieving_letter_url,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      setWorkHistory((prev) => [data, ...prev]);
      // Resolve signed URLs for new entry
      for (const [suffix, path] of Object.entries({ offer: offer_letter_url, experience: experience_letter_url, relieving: relieving_letter_url })) {
        if (path) resolveSignedUrl(`wh_${data.id}_${suffix}`, path);
      }
      setWorkForm({ company_name: "", from_year: "", to_year: "", role: "" });
      setWorkFiles({ offer: null, experience: null, relieving: null });
      setShowWorkForm(false);
    } catch (err) {
      setWorkError(err.message);
    }
    setSavingWork(false);
  }

  async function handleDeleteWork(id) {
    if (!confirm("Delete this work experience entry?")) return;
    await supabase.from("employee_work_history").delete().eq("id", id);
    setWorkHistory((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleAddPayslip() {
    if (!payslipForm.month_label.trim()) {
      setPayslipError("Month label is required (e.g. January 2026).");
      return;
    }
    if (!payslipFile) {
      setPayslipError("Please select a PDF file.");
      return;
    }
    if (payslipFile.type !== "application/pdf") {
      setPayslipError("Only PDF files are allowed.");
      return;
    }
    setSavingPayslip(true);
    setPayslipError("");

    try {
      const prefix = payslipForm.document_type === "payslip" ? "payslips" : "bank-statements";
      const file_url = await uploadToStorage(payslipFile, prefix);

      const { data, error } = await supabase
        .from("employee_payslips")
        .insert({
          employee_id: employee.id,
          document_type: payslipForm.document_type,
          month_label: payslipForm.month_label.trim(),
          file_url,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      setPayslips((prev) => [data, ...prev]);
      resolveSignedUrl(`ps_${data.id}`, file_url);
      setPayslipForm({ document_type: "payslip", month_label: "" });
      setPayslipFile(null);
      setShowPayslipForm(false);
    } catch (err) {
      setPayslipError(err.message);
    }
    setSavingPayslip(false);
  }

  async function handleDeletePayslip(id) {
    if (!confirm("Delete this document?")) return;
    await supabase.from("employee_payslips").delete().eq("id", id);
    setPayslips((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSignOut() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      fetch("/api/activity-log", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "SIGN_OUT", metadata: { email: session.user?.email } }),
      }).catch(() => {});
    }
    await supabase.auth.signOut();
    router.push("/signin");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
        Loading...
      </div>
    );
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const provider = user?.app_metadata?.provider || "email";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "Unknown";

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and security settings.</p>
      </div>

      {/* Account info */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          Account Information
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-semibold">
              {(user?.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">Auth provider: {provider}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider">Member since</span>
              </div>
              <p className="text-sm">{createdAt}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <ShieldIcon className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider">Last sign in</span>
              </div>
              <p className="text-sm">{lastSignIn}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-border text-xs text-muted-foreground">
            <MailIcon className="h-3.5 w-3.5" />
            User ID: <span className="font-mono">{user?.id}</span>
          </div>

          {employee?.role && employee.role !== "user" && (
            <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
              <ShieldIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Role:</span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ROLE_BADGE[employee.role] ?? ROLE_BADGE.viewer}`}>
                {employee.role}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Employee details */}
      {employee && (
        <>
          {saveMsg && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">{saveMsg}</div>
          )}
          {saveError && editing === null && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{saveError}</div>
          )}

          {/* Editable sections */}
          {Object.entries(EDITABLE_SECTIONS).map(([sectionKey, section]) => {
            const Icon = section.icon;
            const isEditing = editing === sectionKey;

            return (
              <div key={sectionKey} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {section.title}
                  </h3>
                  {!isEditing ? (
                    <button
                      onClick={() => startEditing(sectionKey)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <PencilIcon size={12} /> Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <XIcon size={12} /> Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
                      >
                        {saving ? <LoaderIcon size={12} className="animate-spin" /> : <SaveIcon size={12} />}
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
                {isEditing && saveError && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 mb-4">{saveError}</div>
                )}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {section.fields.map((field) => (
                    isEditing ? (
                      <div key={field.key}>
                        <p className="text-[11px] text-muted-foreground mb-1">{field.label}</p>
                        <EditableInput
                          value={editData[field.key]}
                          onChange={(val) => setEditData((prev) => ({ ...prev, [field.key]: val }))}
                          type={field.type}
                          placeholder={field.placeholder}
                          options={field.options}
                        />
                      </div>
                    ) : (
                      <DetailField key={field.key} label={field.label} value={employee[field.key]} />
                    )
                  ))}
                </div>
              </div>
            );
          })}

          {/* Employment section — editable by admin/owner only */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <EMPLOYMENT_SECTION.icon className="h-4 w-4 text-muted-foreground" /> {EMPLOYMENT_SECTION.title}
              </h3>
              {isAdmin && (
                editing !== "employment" ? (
                  <button
                    onClick={() => startEditing("employment")}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <PencilIcon size={12} /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={cancelEditing} disabled={saving} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <XIcon size={12} /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors">
                      {saving ? <LoaderIcon size={12} className="animate-spin" /> : <SaveIcon size={12} />}
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )
              )}
            </div>
            {editing === "employment" && saveError && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 mb-4">{saveError}</div>
            )}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {EMPLOYMENT_SECTION.fields.map((field) => (
                editing === "employment" ? (
                  <div key={field.key}>
                    <p className="text-[11px] text-muted-foreground mb-1">{field.label}</p>
                    <EditableInput
                      value={editData[field.key]}
                      onChange={(val) => setEditData((prev) => ({ ...prev, [field.key]: val }))}
                      type={field.type}
                      placeholder={field.placeholder}
                      options={field.options}
                    />
                  </div>
                ) : (
                  <DetailField key={field.key} label={field.label} value={employee[field.key] || (field.key === "employee_status" ? "active" : undefined)} />
                )
              ))}
            </div>
          </div>

          {/* Documents section with re-upload */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-muted-foreground" /> Documents
            </h3>
            {docMsg && <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400 mb-3">{docMsg}</div>}
            {docError && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 mb-3">{docError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* PAN Card */}
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">PAN Card (PDF)</p>
                {employee.pan_card_url && signedUrls.pan && (
                  <a
                    href={signedUrls.pan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <FileTextIcon size={16} className="text-orange-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">PAN Card</p>
                      <p className="text-[11px] text-muted-foreground">View PDF</p>
                    </div>
                  </a>
                )}
                <label className="flex items-center gap-3 rounded-md border border-dashed border-border hover:border-muted-foreground px-4 py-3 cursor-pointer transition-colors">
                  {panFile ? <FileIcon size={16} className="text-green-400 shrink-0" /> : <UploadIcon size={16} className="text-muted-foreground shrink-0" />}
                  <span className="text-sm truncate">{panFile ? panFile.name : employee.pan_card_url ? "Replace PAN card" : "Upload PAN card"}</span>
                  {panFile && <button type="button" onClick={(e) => { e.preventDefault(); setPanFile(null); }} className="ml-auto text-muted-foreground hover:text-foreground"><XIcon size={14} /></button>}
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => { setDocError(""); setDocMsg(""); setPanFile(e.target.files?.[0] || null); }} />
                </label>
                {panFile && (
                  <button
                    onClick={() => handleDocUpload("pan")}
                    disabled={uploadingDocs}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                  >
                    {uploadingDocs ? <LoaderIcon size={12} className="animate-spin" /> : <SaveIcon size={12} />}
                    {uploadingDocs ? "Uploading..." : "Save PAN Card"}
                  </button>
                )}
              </div>

              {/* Aadhaar Card */}
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Aadhaar Card (PDF)</p>
                {employee.aadhaar_card_url && signedUrls.aadhaar && (
                  <a
                    href={signedUrls.aadhaar}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <FileTextIcon size={16} className="text-blue-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Aadhaar Card</p>
                      <p className="text-[11px] text-muted-foreground">View PDF</p>
                    </div>
                  </a>
                )}
                <label className="flex items-center gap-3 rounded-md border border-dashed border-border hover:border-muted-foreground px-4 py-3 cursor-pointer transition-colors">
                  {aadhaarFile ? <FileIcon size={16} className="text-green-400 shrink-0" /> : <UploadIcon size={16} className="text-muted-foreground shrink-0" />}
                  <span className="text-sm truncate">{aadhaarFile ? aadhaarFile.name : employee.aadhaar_card_url ? "Replace Aadhaar card" : "Upload Aadhaar card"}</span>
                  {aadhaarFile && <button type="button" onClick={(e) => { e.preventDefault(); setAadhaarFile(null); }} className="ml-auto text-muted-foreground hover:text-foreground"><XIcon size={14} /></button>}
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => { setDocError(""); setDocMsg(""); setAadhaarFile(e.target.files?.[0] || null); }} />
                </label>
                {aadhaarFile && (
                  <button
                    onClick={() => handleDocUpload("aadhaar")}
                    disabled={uploadingDocs}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                  >
                    {uploadingDocs ? <LoaderIcon size={12} className="animate-spin" /> : <SaveIcon size={12} />}
                    {uploadingDocs ? "Uploading..." : "Save Aadhaar Card"}
                  </button>
                )}
              </div>

              {/* Resume */}
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Resume (PDF)</p>
                {employee.resume_url && signedUrls.resume && (
                  <a
                    href={signedUrls.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <FileTextIcon size={16} className="text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Resume</p>
                      <p className="text-[11px] text-muted-foreground">View PDF</p>
                    </div>
                  </a>
                )}
                <label className="flex items-center gap-3 rounded-md border border-dashed border-border hover:border-muted-foreground px-4 py-3 cursor-pointer transition-colors">
                  {resumeFile ? <FileIcon size={16} className="text-green-400 shrink-0" /> : <UploadIcon size={16} className="text-muted-foreground shrink-0" />}
                  <span className="text-sm truncate">{resumeFile ? resumeFile.name : employee.resume_url ? "Replace resume" : "Upload resume"}</span>
                  {resumeFile && <button type="button" onClick={(e) => { e.preventDefault(); setResumeFile(null); }} className="ml-auto text-muted-foreground hover:text-foreground"><XIcon size={14} /></button>}
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => { setDocError(""); setDocMsg(""); setResumeFile(e.target.files?.[0] || null); }} />
                </label>
                {resumeFile && (
                  <button
                    onClick={() => handleDocUpload("resume")}
                    disabled={uploadingDocs}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                  >
                    {uploadingDocs ? <LoaderIcon size={12} className="animate-spin" /> : <SaveIcon size={12} />}
                    {uploadingDocs ? "Uploading..." : "Save Resume"}
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Previous Work Experience */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-muted-foreground" /> Previous Work Experience
              </h3>
              {!showWorkForm && (
                <button
                  onClick={() => { setShowWorkForm(true); setWorkError(""); }}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
                >
                  <PlusIcon size={12} /> Add
                </button>
              )}
            </div>

            {showWorkForm && (
              <div className="rounded-lg border border-border bg-background p-4 mb-4 space-y-3">
                {workError && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{workError}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Company Name *</p>
                    <input value={workForm.company_name} onChange={(e) => setWorkForm((p) => ({ ...p, company_name: e.target.value }))} placeholder="Company name" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Role *</p>
                    <input value={workForm.role} onChange={(e) => setWorkForm((p) => ({ ...p, role: e.target.value }))} placeholder="e.g. Software Engineer" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">From *</p>
                    <input type="month" value={workForm.from_year} onChange={(e) => setWorkForm((p) => ({ ...p, from_year: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">To *</p>
                    <input type="month" value={workForm.to_year} onChange={(e) => setWorkForm((p) => ({ ...p, to_year: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Offer Letter (PDF)</p>
                    <label className="flex items-center gap-2 rounded-md border border-dashed border-border hover:border-muted-foreground px-3 py-2 cursor-pointer transition-colors text-xs">
                      {workFiles.offer ? <FileIcon size={12} className="text-green-400" /> : <UploadIcon size={12} className="text-muted-foreground" />}
                      <span className="truncate">{workFiles.offer ? workFiles.offer.name : "Upload"}</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => setWorkFiles((p) => ({ ...p, offer: e.target.files?.[0] || null }))} />
                    </label>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Experience Letter (PDF)</p>
                    <label className="flex items-center gap-2 rounded-md border border-dashed border-border hover:border-muted-foreground px-3 py-2 cursor-pointer transition-colors text-xs">
                      {workFiles.experience ? <FileIcon size={12} className="text-green-400" /> : <UploadIcon size={12} className="text-muted-foreground" />}
                      <span className="truncate">{workFiles.experience ? workFiles.experience.name : "Upload"}</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => setWorkFiles((p) => ({ ...p, experience: e.target.files?.[0] || null }))} />
                    </label>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Relieving Letter (PDF)</p>
                    <label className="flex items-center gap-2 rounded-md border border-dashed border-border hover:border-muted-foreground px-3 py-2 cursor-pointer transition-colors text-xs">
                      {workFiles.relieving ? <FileIcon size={12} className="text-green-400" /> : <UploadIcon size={12} className="text-muted-foreground" />}
                      <span className="truncate">{workFiles.relieving ? workFiles.relieving.name : "Upload"}</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => setWorkFiles((p) => ({ ...p, relieving: e.target.files?.[0] || null }))} />
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleAddWork} disabled={savingWork} className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
                    {savingWork ? <LoaderIcon size={12} className="animate-spin" /> : <SaveIcon size={12} />}
                    {savingWork ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => { setShowWorkForm(false); setWorkError(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              </div>
            )}

            {workHistory.length === 0 && !showWorkForm ? (
              <p className="text-sm text-muted-foreground italic">No previous work experience added.</p>
            ) : (
              <div className="space-y-3">
                {workHistory.map((w) => (
                  <div key={w.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{w.company_name}</p>
                        <p className="text-xs text-muted-foreground">{w.role} &middot; {formatMonth(w.from_year)} – {formatMonth(w.to_year)}</p>
                      </div>
                      <button onClick={() => handleDeleteWork(w.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                        <Trash2Icon size={14} />
                      </button>
                    </div>
                    {(w.offer_letter_url || w.experience_letter_url || w.relieving_letter_url) && (
                      <div className="flex gap-3 mt-3 flex-wrap">
                        {w.offer_letter_url && signedUrls[`wh_${w.id}_offer`] && (
                          <a href={signedUrls[`wh_${w.id}_offer`]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <FileTextIcon size={12} /> Offer Letter
                          </a>
                        )}
                        {w.experience_letter_url && signedUrls[`wh_${w.id}_experience`] && (
                          <a href={signedUrls[`wh_${w.id}_experience`]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <FileTextIcon size={12} /> Experience Letter
                          </a>
                        )}
                        {w.relieving_letter_url && signedUrls[`wh_${w.id}_relieving`] && (
                          <a href={signedUrls[`wh_${w.id}_relieving`]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <FileTextIcon size={12} /> Relieving Letter
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payslips / Bank Statements */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <WalletIcon className="h-4 w-4 text-muted-foreground" /> Payslips / Bank Statements
              </h3>
              {!showPayslipForm && (
                <button
                  onClick={() => { setShowPayslipForm(true); setPayslipError(""); }}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
                >
                  <PlusIcon size={12} /> Add
                </button>
              )}
            </div>

            {showPayslipForm && (
              <div className="rounded-lg border border-border bg-background p-4 mb-4 space-y-3">
                {payslipError && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{payslipError}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Type *</p>
                    <select value={payslipForm.document_type} onChange={(e) => setPayslipForm((p) => ({ ...p, document_type: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60">
                      <option value="payslip">Payslip</option>
                      <option value="bank_statement">Bank Statement</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Month *</p>
                    <input value={payslipForm.month_label} onChange={(e) => setPayslipForm((p) => ({ ...p, month_label: e.target.value }))} placeholder="e.g. January 2026" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">File (PDF) *</p>
                  <label className="flex items-center gap-3 rounded-md border border-dashed border-border hover:border-muted-foreground px-4 py-3 cursor-pointer transition-colors">
                    {payslipFile ? <FileIcon size={16} className="text-green-400 shrink-0" /> : <UploadIcon size={16} className="text-muted-foreground shrink-0" />}
                    <span className="text-sm truncate">{payslipFile ? payslipFile.name : "Select PDF"}</span>
                    {payslipFile && <button type="button" onClick={(e) => { e.preventDefault(); setPayslipFile(null); }} className="ml-auto text-muted-foreground hover:text-foreground"><XIcon size={14} /></button>}
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPayslipFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleAddPayslip} disabled={savingPayslip} className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
                    {savingPayslip ? <LoaderIcon size={12} className="animate-spin" /> : <SaveIcon size={12} />}
                    {savingPayslip ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => { setShowPayslipForm(false); setPayslipError(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              </div>
            )}

            {payslips.length === 0 && !showPayslipForm ? (
              <p className="text-sm text-muted-foreground italic">No payslips or bank statements added. Please add your last 3 months.</p>
            ) : (
              <div className="space-y-2">
                {payslips.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <a
                      href={signedUrls[`ps_${p.id}`] || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 ${signedUrls[`ps_${p.id}`] ? "hover:underline" : "opacity-50 pointer-events-none"}`}
                    >
                      <FileTextIcon size={16} className={p.document_type === "payslip" ? "text-green-400" : "text-purple-400"} />
                      <div>
                        <p className="text-sm font-medium">{p.month_label}</p>
                        <p className="text-[11px] text-muted-foreground">{p.document_type === "payslip" ? "Payslip" : "Bank Statement"}</p>
                      </div>
                    </a>
                    <button onClick={() => handleDeletePayslip(p.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                      <Trash2Icon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <KeyIcon className="h-4 w-4 text-muted-foreground" />
          Change Password
        </h3>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          {passwordError && (
            <p className="text-xs text-red-400">{passwordError}</p>
          )}
          {passwordMsg && (
            <p className="text-xs text-green-400">{passwordMsg}</p>
          )}
          <button
            type="submit"
            disabled={changingPassword}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>

      {/* Sign out */}
      <div className="rounded-lg border border-border bg-card p-5">
        <button
          onClick={handleSignOut}
          className="text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
        >
          <LogOutIcon className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

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
} from "lucide-react";

const SUPABASE_STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

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
};

// Read-only fields the user should not edit themselves
const READONLY_SECTION = {
  title: "Employment Information",
  icon: BriefcaseIcon,
  fields: [
    { key: "employee_number", label: "Employee ID" },
    { key: "date_of_joining", label: "Date of Joining" },
    { key: "designation", label: "Designation" },
    { key: "department", label: "Department" },
    { key: "role", label: "Role" },
    { key: "employee_status", label: "Status" },
  ],
};

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
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
    />
  );
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // section key being edited
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  // Document re-upload
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docMsg, setDocMsg] = useState("");
  const [docError, setDocError] = useState("");

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
      if (emp) setEmployee(emp);

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

  function startEditing(sectionKey) {
    const section = EDITABLE_SECTIONS[sectionKey];
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
    const file = type === "pan" ? panFile : aadhaarFile;
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

    const ext = file.name.split(".").pop();
    const prefix = type === "pan" ? "pan-cards" : "aadhaar-cards";
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("employee-documents")
      .upload(path, file, { contentType: "application/pdf" });

    if (uploadErr) {
      setDocError(uploadErr.message);
      setUploadingDocs(false);
      return;
    }

    const column = type === "pan" ? "pan_card_url" : "aadhaar_card_url";
    const { error: updateErr } = await supabase
      .from("employees")
      .update({ [column]: path })
      .eq("id", employee.id);

    if (updateErr) {
      setDocError(updateErr.message);
    } else {
      setEmployee((prev) => ({ ...prev, [column]: path }));
      setDocMsg(`${type === "pan" ? "PAN" : "Aadhaar"} card updated.`);
      if (type === "pan") setPanFile(null);
      else setAadhaarFile(null);
    }
    setUploadingDocs(false);
  }

  async function handleSignOut() {
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

          {/* Read-only employment section */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <READONLY_SECTION.icon className="h-4 w-4 text-muted-foreground" /> {READONLY_SECTION.title}
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {READONLY_SECTION.fields.map((field) => (
                <DetailField key={field.key} label={field.label} value={employee[field.key] || (field.key === "employee_status" ? "active" : undefined)} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PAN Card */}
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">PAN Card (PDF)</p>
                {employee.pan_card_url && (
                  <a
                    href={`${SUPABASE_STORAGE}/employee-documents/${employee.pan_card_url}`}
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
                {employee.aadhaar_card_url && (
                  <a
                    href={`${SUPABASE_STORAGE}/employee-documents/${employee.aadhaar_card_url}`}
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
            </div>
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
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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

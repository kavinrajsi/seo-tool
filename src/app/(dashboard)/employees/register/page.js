"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  UserIcon,
  PhoneIcon,
  BriefcaseIcon,
  MapPinIcon,
  ShieldIcon,
  CheckCircleIcon,
  LoaderIcon,
  UploadIcon,
  FileIcon,
  XIcon,
} from "lucide-react";

const SECTIONS = [
  { id: "personal", label: "Personal Information", icon: UserIcon },
  { id: "contact", label: "Contact Information", icon: PhoneIcon },
  { id: "employment", label: "Employment Information", icon: BriefcaseIcon },
  { id: "address", label: "Address Information", icon: MapPinIcon },
  { id: "additional", label: "Additional Information", icon: ShieldIcon },
];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_TYPES = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "Other"];
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const INITIAL = {
  first_name: "", middle_name: "", last_name: "", gender: "", date_of_birth: "",
  work_email: "", personal_email: "", mobile_number: "", mobile_number_secondary: "",
  employee_number: "", date_of_joining: "", designation: "", department: "",
  personal_address_line_1: "", personal_address_line_2: "", personal_city: "", personal_state: "", personal_postal_code: "",
  pan_number: "", aadhaar_number: "", blood_type: "", blood_type_custom: "", shirt_size: "",
};

function validate(form) {
  const errors = {};
  const req = (field, label) => { if (!form[field]?.trim()) errors[field] = `${label} is required`; };

  req("first_name", "First name");
  req("last_name", "Last name");
  req("gender", "Gender");
  req("date_of_birth", "Date of birth");
  req("work_email", "Work email");
  req("personal_email", "Personal email");
  req("mobile_number", "Mobile number");
  req("mobile_number_secondary", "Emergency number");
  req("date_of_joining", "Date of joining");
  req("personal_address_line_1", "Address line 1");
  req("personal_city", "City");
  req("personal_state", "State");
  req("personal_postal_code", "Postal code");
  req("pan_number", "PAN number");
  req("aadhaar_number", "Aadhaar number");
  req("shirt_size", "Shirt size");

  if (!form.blood_type?.trim()) {
    errors.blood_type = "Blood type is required";
  }

  // Email format
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (form.work_email && !emailRe.test(form.work_email)) errors.work_email = "Invalid email format";
  if (form.personal_email && !emailRe.test(form.personal_email)) errors.personal_email = "Invalid email format";

  // Date format DD-MM-YYYY
  const dateRe = /^\d{2}-\d{2}-\d{4}$/;
  if (form.date_of_birth && !dateRe.test(form.date_of_birth)) errors.date_of_birth = "Use format DD-MM-YYYY";
  if (form.date_of_joining && !dateRe.test(form.date_of_joining)) errors.date_of_joining = "Use format DD-MM-YYYY";

  // PAN: 5 letters + 4 digits + 1 letter
  if (form.pan_number && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan_number.toUpperCase())) errors.pan_number = "Format: ABCDE1234F";

  // Aadhaar: 12 digits
  if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number)) errors.aadhaar_number = "Must be 12 digits";

  // Phone: 10 digits
  if (form.mobile_number && !/^\d{10}$/.test(form.mobile_number)) errors.mobile_number = "Must be 10 digits";
  if (form.mobile_number_secondary && !/^\d{10}$/.test(form.mobile_number_secondary)) errors.mobile_number_secondary = "Must be 10 digits";

  return errors;
}

function Field({ label, required, error, note, children }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {note && !error && <p className="text-[10px] text-muted-foreground mt-1">{note}</p>}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, error, disabled, placeholder, type = "text", className = "" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full rounded-md border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 disabled:opacity-40 disabled:bg-muted/30 ${error ? "border-red-400" : "border-border"} bg-background ${className}`}
    />
  );
}

function Select({ value, onChange, error, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 bg-background ${error ? "border-red-400" : "border-border"} ${!value ? "text-muted-foreground" : ""}`}
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export default function EmployeeRegister() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const sectionRefs = useRef({});

  useEffect(() => {
    supabase.from("departments").select("name").order("name").then(({ data }) => {
      if (data) setDepartments(data.map((d) => d.name));
    });
  }, []);

  function handleFileSelect(e, setter, errorField) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setErrors((prev) => ({ ...prev, [errorField]: "Only PDF files are allowed." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [errorField]: "File must be under 5 MB." }));
      return;
    }
    setter(file);
    setErrors((prev) => { const n = { ...prev }; delete n[errorField]; return n; });
  }

  async function uploadFile(file, prefix) {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("employee-documents").upload(path, file, { contentType: "application/pdf" });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return path;
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function blur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate(form);
    if (errs[field]) setErrors((prev) => ({ ...prev, [field]: errs[field] }));
  }

  function scrollTo(id) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    const errs = validate(form);
    setErrors(errs);
    setTouched(Object.keys(INITIAL).reduce((a, k) => ({ ...a, [k]: true }), {}));

    if (!panFile) errs.pan_file = "PAN card PDF is required.";
    if (!aadhaarFile) errs.aadhaar_file = "Aadhaar card PDF is required.";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErrorField = Object.keys(errs)[0];
      for (const section of SECTIONS) {
        const el = sectionRefs.current[section.id];
        if (el?.querySelector(`[data-field="${firstErrorField}"]`)) {
          scrollTo(section.id);
          break;
        }
      }
      return;
    }

    setSubmitting(true);

    const bloodType = form.blood_type === "Other" ? form.blood_type_custom : form.blood_type;

    let panPath, aadhaarPath;
    try {
      [panPath, aadhaarPath] = await Promise.all([
        uploadFile(panFile, "pan-cards"),
        uploadFile(aadhaarFile, "aadhaar-cards"),
      ]);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
      return;
    }

    const row = {
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim(),
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      work_email: form.work_email.trim().toLowerCase(),
      personal_email: form.personal_email.trim().toLowerCase(),
      mobile_number: form.mobile_number.trim(),
      mobile_number_secondary: form.mobile_number_secondary.trim(),
      employee_number: form.employee_number.trim() || null,
      date_of_joining: form.date_of_joining,
      designation: null,
      department: form.department.trim() || null,
      personal_address_line_1: form.personal_address_line_1.trim(),
      personal_address_line_2: form.personal_address_line_2.trim() || null,
      personal_city: form.personal_city.trim(),
      personal_state: form.personal_state.trim(),
      personal_postal_code: form.personal_postal_code.trim(),
      pan_number: form.pan_number.trim().toUpperCase(),
      aadhaar_number: form.aadhaar_number.trim(),
      blood_type: bloodType,
      shirt_size: form.shirt_size,
      pan_card_url: panPath,
      aadhaar_card_url: aadhaarPath,
      role: "user",
      employee_status: "active",
    };

    const { error } = await supabase.from("employees").insert(row);

    if (error) {
      if (error.message?.includes("employees_work_email_key")) {
        setErrors((prev) => ({ ...prev, work_email: "This email is already registered." }));
      } else {
        setSubmitError(error.message);
      }
      setSubmitting(false);
      return;
    }

    setSuccess(`${form.first_name} ${form.last_name}`);
    setSubmitting(false);
  }

  function handleRegisterAnother() {
    setForm(INITIAL);
    setErrors({});
    setTouched({});
    setSuccess(null);
    setSubmitError("");
    setPanFile(null);
    setAadhaarFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (success) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircleIcon size={32} className="text-green-400" />
        </div>
        <h2 className="text-xl font-semibold">Employee Registered</h2>
        <p className="text-muted-foreground text-sm"><strong>{success}</strong> has been successfully registered.</p>
        <button
          onClick={handleRegisterAnother}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Register Another Employee
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-6 py-4">
      {/* Section navigator */}
      <nav className="hidden lg:flex flex-col gap-1 w-56 shrink-0 sticky top-4 self-start">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-3">Sections</p>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors text-left"
          >
            <s.icon size={14} />
            {s.label}
          </button>
        ))}
      </nav>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Employee Registration</h1>
          <p className="text-muted-foreground mt-1 text-sm">Fill in the details below to register a new employee.</p>
        </div>

        {submitError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{submitError}</div>
        )}

        {/* 1. Personal Information */}
        <section ref={(el) => (sectionRefs.current.personal = el)} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <UserIcon size={16} className="text-muted-foreground" /> Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="First Name" required error={touched.first_name && errors.first_name}>
              <div data-field="first_name"><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} onBlur={() => blur("first_name")} error={touched.first_name && errors.first_name} /></div>
            </Field>
            <Field label="Middle Name">
              <Input value={form.middle_name} onChange={(e) => set("middle_name", e.target.value)} />
            </Field>
            <Field label="Last Name" required error={touched.last_name && errors.last_name}>
              <div data-field="last_name"><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} onBlur={() => blur("last_name")} error={touched.last_name && errors.last_name} /></div>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Gender" required error={touched.gender && errors.gender}>
              <div data-field="gender"><Select value={form.gender} onChange={(e) => set("gender", e.target.value)} options={GENDERS} placeholder="Select gender" error={touched.gender && errors.gender} /></div>
            </Field>
            <Field label="Date of Birth" required error={touched.date_of_birth && errors.date_of_birth}>
              <div data-field="date_of_birth"><Input value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} onBlur={() => blur("date_of_birth")} placeholder="DD-MM-YYYY" error={touched.date_of_birth && errors.date_of_birth} /></div>
            </Field>
          </div>
        </section>

        {/* 2. Contact Information */}
        <section ref={(el) => (sectionRefs.current.contact = el)} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <PhoneIcon size={16} className="text-muted-foreground" /> Contact Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Work Email" required error={touched.work_email && errors.work_email} note="Use your personal email if a work email ID is not available.">
              <div data-field="work_email"><Input type="email" value={form.work_email} onChange={(e) => set("work_email", e.target.value)} onBlur={() => blur("work_email")} placeholder="name@company.com" error={touched.work_email && errors.work_email} /></div>
            </Field>
            <Field label="Personal Email" required error={touched.personal_email && errors.personal_email}>
              <div data-field="personal_email"><Input type="email" value={form.personal_email} onChange={(e) => set("personal_email", e.target.value)} onBlur={() => blur("personal_email")} placeholder="name@gmail.com" error={touched.personal_email && errors.personal_email} /></div>
            </Field>
            <Field label="Mobile Number" required error={touched.mobile_number && errors.mobile_number}>
              <div data-field="mobile_number"><Input value={form.mobile_number} onChange={(e) => set("mobile_number", e.target.value)} onBlur={() => blur("mobile_number")} placeholder="10-digit number" error={touched.mobile_number && errors.mobile_number} /></div>
            </Field>
            <Field label="Emergency Number" required error={touched.mobile_number_secondary && errors.mobile_number_secondary}>
              <div data-field="mobile_number_secondary"><Input value={form.mobile_number_secondary} onChange={(e) => set("mobile_number_secondary", e.target.value)} onBlur={() => blur("mobile_number_secondary")} placeholder="10-digit number" error={touched.mobile_number_secondary && errors.mobile_number_secondary} /></div>
            </Field>
          </div>
        </section>

        {/* 3. Employment Information */}
        <section ref={(el) => (sectionRefs.current.employment = el)} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <BriefcaseIcon size={16} className="text-muted-foreground" /> Employment Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Employee ID" note="Auto-generated if left blank.">
              <Input value={form.employee_number} onChange={(e) => set("employee_number", e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Date of Joining" required error={touched.date_of_joining && errors.date_of_joining}>
              <div data-field="date_of_joining"><Input value={form.date_of_joining} onChange={(e) => set("date_of_joining", e.target.value)} onBlur={() => blur("date_of_joining")} placeholder="DD-MM-YYYY" error={touched.date_of_joining && errors.date_of_joining} /></div>
            </Field>
            <Field label="Designation" note="Please leave empty.">
              <Input value="" disabled placeholder="Leave empty" />
            </Field>
            <Field label="Department">
              <select value={form.department} onChange={(e) => set("department", e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60">
                <option value="">Select department...</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* 4. Address Information */}
        <section ref={(el) => (sectionRefs.current.address = el)} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <MapPinIcon size={16} className="text-muted-foreground" /> Address Information
          </h2>
          <Field label="Address Line 1" required error={touched.personal_address_line_1 && errors.personal_address_line_1}>
            <div data-field="personal_address_line_1"><Input value={form.personal_address_line_1} onChange={(e) => set("personal_address_line_1", e.target.value)} onBlur={() => blur("personal_address_line_1")} error={touched.personal_address_line_1 && errors.personal_address_line_1} /></div>
          </Field>
          <Field label="Address Line 2">
            <Input value={form.personal_address_line_2} onChange={(e) => set("personal_address_line_2", e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="City" required error={touched.personal_city && errors.personal_city}>
              <div data-field="personal_city"><Input value={form.personal_city} onChange={(e) => set("personal_city", e.target.value)} onBlur={() => blur("personal_city")} error={touched.personal_city && errors.personal_city} /></div>
            </Field>
            <Field label="State" required error={touched.personal_state && errors.personal_state}>
              <div data-field="personal_state"><Input value={form.personal_state} onChange={(e) => set("personal_state", e.target.value)} onBlur={() => blur("personal_state")} error={touched.personal_state && errors.personal_state} /></div>
            </Field>
            <Field label="Postal Code" required error={touched.personal_postal_code && errors.personal_postal_code}>
              <div data-field="personal_postal_code"><Input value={form.personal_postal_code} onChange={(e) => set("personal_postal_code", e.target.value)} onBlur={() => blur("personal_postal_code")} error={touched.personal_postal_code && errors.personal_postal_code} /></div>
            </Field>
          </div>
        </section>

        {/* 5. Additional Information */}
        <section ref={(el) => (sectionRefs.current.additional = el)} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <ShieldIcon size={16} className="text-muted-foreground" /> Additional Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="PAN Number" required error={touched.pan_number && errors.pan_number}>
              <div data-field="pan_number"><Input value={form.pan_number} onChange={(e) => set("pan_number", e.target.value.toUpperCase())} onBlur={() => blur("pan_number")} placeholder="ABCDE1234F" error={touched.pan_number && errors.pan_number} className="uppercase" /></div>
            </Field>
            <Field label="Aadhaar Number" required error={touched.aadhaar_number && errors.aadhaar_number}>
              <div data-field="aadhaar_number"><Input value={form.aadhaar_number} onChange={(e) => set("aadhaar_number", e.target.value.replace(/\D/g, ""))} onBlur={() => blur("aadhaar_number")} placeholder="12-digit number" error={touched.aadhaar_number && errors.aadhaar_number} /></div>
            </Field>
            <Field label="PAN Card (PDF)" required error={errors.pan_file}>
              <label className={`flex items-center gap-3 rounded-md border border-dashed px-4 py-3 cursor-pointer transition-colors ${errors.pan_file ? "border-red-400" : "border-border hover:border-muted-foreground"}`}>
                {panFile ? <FileIcon size={16} className="text-green-400 shrink-0" /> : <UploadIcon size={16} className="text-muted-foreground shrink-0" />}
                <span className="text-sm truncate">{panFile ? panFile.name : "Upload PAN card PDF"}</span>
                {panFile && <button type="button" onClick={(e) => { e.preventDefault(); setPanFile(null); }} className="ml-auto text-muted-foreground hover:text-foreground"><XIcon size={14} /></button>}
                <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileSelect(e, setPanFile, "pan_file")} />
              </label>
            </Field>
            <Field label="Aadhaar Card (PDF)" required error={errors.aadhaar_file}>
              <label className={`flex items-center gap-3 rounded-md border border-dashed px-4 py-3 cursor-pointer transition-colors ${errors.aadhaar_file ? "border-red-400" : "border-border hover:border-muted-foreground"}`}>
                {aadhaarFile ? <FileIcon size={16} className="text-green-400 shrink-0" /> : <UploadIcon size={16} className="text-muted-foreground shrink-0" />}
                <span className="text-sm truncate">{aadhaarFile ? aadhaarFile.name : "Upload Aadhaar card PDF"}</span>
                {aadhaarFile && <button type="button" onClick={(e) => { e.preventDefault(); setAadhaarFile(null); }} className="ml-auto text-muted-foreground hover:text-foreground"><XIcon size={14} /></button>}
                <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileSelect(e, setAadhaarFile, "aadhaar_file")} />
              </label>
            </Field>
            <Field label="Blood Type" required error={touched.blood_type && errors.blood_type}>
              <div data-field="blood_type">
                <Select value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} options={BLOOD_TYPES} placeholder="Select blood type" error={touched.blood_type && errors.blood_type} />
                {form.blood_type === "Other" && (
                  <Input value={form.blood_type_custom} onChange={(e) => set("blood_type_custom", e.target.value)} placeholder="Enter blood type" className="mt-2" />
                )}
              </div>
            </Field>
            <Field label="Shirt Size" required error={touched.shirt_size && errors.shirt_size}>
              <div data-field="shirt_size"><Select value={form.shirt_size} onChange={(e) => set("shirt_size", e.target.value)} options={SHIRT_SIZES} placeholder="Select size" error={touched.shirt_size && errors.shirt_size} /></div>
            </Field>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end pb-8">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {submitting && <LoaderIcon size={16} className="animate-spin" />}
            {submitting ? "Registering..." : "Register Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}

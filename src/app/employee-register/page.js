"use client";

import { useState, useRef } from "react";
import {
  UserIcon,
  PhoneIcon,
  BriefcaseIcon,
  MapPinIcon,
  ShieldIcon,
  CheckCircleIcon,
  LoaderIcon,
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
  req("first_name", "First name"); req("last_name", "Last name"); req("gender", "Gender"); req("date_of_birth", "Date of birth");
  req("work_email", "Work email"); req("personal_email", "Personal email"); req("mobile_number", "Mobile number"); req("mobile_number_secondary", "Emergency number");
  req("date_of_joining", "Date of joining"); req("personal_address_line_1", "Address line 1"); req("personal_city", "City"); req("personal_state", "State"); req("personal_postal_code", "Postal code");
  req("pan_number", "PAN number"); req("aadhaar_number", "Aadhaar number"); req("shirt_size", "Shirt size");
  if (!form.blood_type?.trim()) errors.blood_type = "Blood type is required";

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (form.work_email && !emailRe.test(form.work_email)) errors.work_email = "Invalid email format";
  if (form.personal_email && !emailRe.test(form.personal_email)) errors.personal_email = "Invalid email format";
  const dateRe = /^\d{2}-\d{2}-\d{4}$/;
  if (form.date_of_birth && !dateRe.test(form.date_of_birth)) errors.date_of_birth = "Use format DD-MM-YYYY";
  if (form.date_of_joining && !dateRe.test(form.date_of_joining)) errors.date_of_joining = "Use format DD-MM-YYYY";
  if (form.pan_number && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan_number.toUpperCase())) errors.pan_number = "Format: ABCDE1234F";
  if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number)) errors.aadhaar_number = "Must be 12 digits";
  if (form.mobile_number && !/^\d{10}$/.test(form.mobile_number)) errors.mobile_number = "Must be 10 digits";
  if (form.mobile_number_secondary && !/^\d{10}$/.test(form.mobile_number_secondary)) errors.mobile_number_secondary = "Must be 10 digits";
  return errors;
}

function Field({ label, required, error, note, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-300 mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {note && !error && <p className="text-[10px] text-zinc-500 mt-1">{note}</p>}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, onBlur, error, disabled, placeholder, type = "text", className = "" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 disabled:opacity-40 disabled:bg-zinc-800/50 ${error ? "border-red-500/50" : "border-zinc-700"} ${className}`}
    />
  );
}

function Select({ value, onChange, error, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-zinc-900 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 ${error ? "border-red-500/50" : "border-zinc-700"} ${!value ? "text-zinc-600" : ""}`}
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function PublicEmployeeRegister() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const sectionRefs = useRef({});

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
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const bloodType = form.blood_type === "Other" ? form.blood_type_custom : form.blood_type;

    try {
      const res = await fetch("/api/employees/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, blood_type: bloodType }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.field === "work_email") {
          setErrors((prev) => ({ ...prev, work_email: data.error }));
        } else {
          setSubmitError(data.error);
        }
        setSubmitting(false);
        return;
      }
      setSuccess(data.name);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  function handleRegisterAnother() {
    setForm(INITIAL);
    setErrors({});
    setTouched({});
    setSuccess(null);
    setSubmitError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircleIcon size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100">Registration Complete</h2>
          <p className="text-zinc-400 text-sm"><strong className="text-zinc-200">{success}</strong> has been successfully registered.</p>
          <button onClick={handleRegisterAnother} className="rounded-lg bg-white text-zinc-900 px-6 py-2.5 text-sm font-medium hover:bg-zinc-200 transition-colors">
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8 flex gap-8">
        {/* Section nav */}
        <nav className="hidden lg:flex flex-col gap-1 w-52 shrink-0 sticky top-8 self-start">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Sections</h2>
          </div>
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => scrollTo(s.id)} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors text-left">
              <s.icon size={14} /> {s.label}
            </button>
          ))}
        </nav>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Employee Registration</h1>
            <p className="text-zinc-500 mt-1 text-sm">Please fill in your details below.</p>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{submitError}</div>
          )}

          {/* 1. Personal */}
          <section ref={(el) => (sectionRefs.current.personal = el)} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-300"><UserIcon size={16} className="text-zinc-500" /> Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="First Name" required error={touched.first_name && errors.first_name}>
                <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} onBlur={() => blur("first_name")} error={touched.first_name && errors.first_name} />
              </Field>
              <Field label="Middle Name"><Input value={form.middle_name} onChange={(e) => set("middle_name", e.target.value)} /></Field>
              <Field label="Last Name" required error={touched.last_name && errors.last_name}>
                <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} onBlur={() => blur("last_name")} error={touched.last_name && errors.last_name} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Gender" required error={touched.gender && errors.gender}>
                <Select value={form.gender} onChange={(e) => set("gender", e.target.value)} options={GENDERS} placeholder="Select gender" error={touched.gender && errors.gender} />
              </Field>
              <Field label="Date of Birth" required error={touched.date_of_birth && errors.date_of_birth}>
                <Input value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} onBlur={() => blur("date_of_birth")} placeholder="DD-MM-YYYY" error={touched.date_of_birth && errors.date_of_birth} />
              </Field>
            </div>
          </section>

          {/* 2. Contact */}
          <section ref={(el) => (sectionRefs.current.contact = el)} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-300"><PhoneIcon size={16} className="text-zinc-500" /> Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Work Email" required error={touched.work_email && errors.work_email} note="Use your personal email if a work email ID is not available.">
                <Input type="email" value={form.work_email} onChange={(e) => set("work_email", e.target.value)} onBlur={() => blur("work_email")} placeholder="name@company.com" error={touched.work_email && errors.work_email} />
              </Field>
              <Field label="Personal Email" required error={touched.personal_email && errors.personal_email}>
                <Input type="email" value={form.personal_email} onChange={(e) => set("personal_email", e.target.value)} onBlur={() => blur("personal_email")} placeholder="name@gmail.com" error={touched.personal_email && errors.personal_email} />
              </Field>
              <Field label="Mobile Number" required error={touched.mobile_number && errors.mobile_number}>
                <Input value={form.mobile_number} onChange={(e) => set("mobile_number", e.target.value)} onBlur={() => blur("mobile_number")} placeholder="10-digit number" error={touched.mobile_number && errors.mobile_number} />
              </Field>
              <Field label="Emergency Number" required error={touched.mobile_number_secondary && errors.mobile_number_secondary}>
                <Input value={form.mobile_number_secondary} onChange={(e) => set("mobile_number_secondary", e.target.value)} onBlur={() => blur("mobile_number_secondary")} placeholder="10-digit number" error={touched.mobile_number_secondary && errors.mobile_number_secondary} />
              </Field>
            </div>
          </section>

          {/* 3. Employment */}
          <section ref={(el) => (sectionRefs.current.employment = el)} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-300"><BriefcaseIcon size={16} className="text-zinc-500" /> Employment Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employee ID" note="Auto-generated if left blank.">
                <Input value={form.employee_number} onChange={(e) => set("employee_number", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Date of Joining" required error={touched.date_of_joining && errors.date_of_joining}>
                <Input value={form.date_of_joining} onChange={(e) => set("date_of_joining", e.target.value)} onBlur={() => blur("date_of_joining")} placeholder="DD-MM-YYYY" error={touched.date_of_joining && errors.date_of_joining} />
              </Field>
              <Field label="Designation" note="Please leave empty.">
                <Input value="" disabled placeholder="Leave empty" />
              </Field>
              <Field label="Department">
                <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Engineering" />
              </Field>
            </div>
          </section>

          {/* 4. Address */}
          <section ref={(el) => (sectionRefs.current.address = el)} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-300"><MapPinIcon size={16} className="text-zinc-500" /> Address Information</h2>
            <Field label="Address Line 1" required error={touched.personal_address_line_1 && errors.personal_address_line_1}>
              <Input value={form.personal_address_line_1} onChange={(e) => set("personal_address_line_1", e.target.value)} onBlur={() => blur("personal_address_line_1")} error={touched.personal_address_line_1 && errors.personal_address_line_1} />
            </Field>
            <Field label="Address Line 2"><Input value={form.personal_address_line_2} onChange={(e) => set("personal_address_line_2", e.target.value)} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="City" required error={touched.personal_city && errors.personal_city}>
                <Input value={form.personal_city} onChange={(e) => set("personal_city", e.target.value)} onBlur={() => blur("personal_city")} error={touched.personal_city && errors.personal_city} />
              </Field>
              <Field label="State" required error={touched.personal_state && errors.personal_state}>
                <Input value={form.personal_state} onChange={(e) => set("personal_state", e.target.value)} onBlur={() => blur("personal_state")} error={touched.personal_state && errors.personal_state} />
              </Field>
              <Field label="Postal Code" required error={touched.personal_postal_code && errors.personal_postal_code}>
                <Input value={form.personal_postal_code} onChange={(e) => set("personal_postal_code", e.target.value)} onBlur={() => blur("personal_postal_code")} error={touched.personal_postal_code && errors.personal_postal_code} />
              </Field>
            </div>
          </section>

          {/* 5. Additional */}
          <section ref={(el) => (sectionRefs.current.additional = el)} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-300"><ShieldIcon size={16} className="text-zinc-500" /> Additional Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="PAN Number" required error={touched.pan_number && errors.pan_number}>
                <Input value={form.pan_number} onChange={(e) => set("pan_number", e.target.value.toUpperCase())} onBlur={() => blur("pan_number")} placeholder="ABCDE1234F" error={touched.pan_number && errors.pan_number} className="uppercase" />
              </Field>
              <Field label="Aadhaar Number" required error={touched.aadhaar_number && errors.aadhaar_number}>
                <Input value={form.aadhaar_number} onChange={(e) => set("aadhaar_number", e.target.value.replace(/\D/g, ""))} onBlur={() => blur("aadhaar_number")} placeholder="12-digit number" error={touched.aadhaar_number && errors.aadhaar_number} />
              </Field>
              <Field label="Blood Type" required error={touched.blood_type && errors.blood_type}>
                <Select value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} options={BLOOD_TYPES} placeholder="Select blood type" error={touched.blood_type && errors.blood_type} />
                {form.blood_type === "Other" && (
                  <Input value={form.blood_type_custom} onChange={(e) => set("blood_type_custom", e.target.value)} placeholder="Enter blood type" className="mt-2" />
                )}
              </Field>
              <Field label="Shirt Size" required error={touched.shirt_size && errors.shirt_size}>
                <Select value={form.shirt_size} onChange={(e) => set("shirt_size", e.target.value)} options={SHIRT_SIZES} placeholder="Select size" error={touched.shirt_size && errors.shirt_size} />
              </Field>
            </div>
          </section>

          {/* Submit */}
          <div className="flex justify-end pb-8">
            <button type="submit" disabled={submitting} className="rounded-lg bg-white text-zinc-900 px-8 py-3 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2 transition-colors">
              {submitting && <LoaderIcon size={16} className="animate-spin" />}
              {submitting ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

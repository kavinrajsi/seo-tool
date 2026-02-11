"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import styles from "./page.module.css";

const EMPTY_FORM = {
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  date_of_joining: "",
  designation: "",
  department: "",
  employee_status: "active",
  role: "",
  work_email: "",
  personal_email: "",
  mobile_number: "",
  mobile_number_emergency: "",
  personal_address_line_1: "",
  personal_address_line_2: "",
  personal_city: "",
  personal_state: "",
  personal_postal_code: "",
  aadhaar_number: "",
  pan_number: "",
  blood_type: "",
  shirt_size: "",
  employee_number: "",
};

export default function NewEmployeePage() {
  return (
    <Suspense fallback={<><Navbar /><div className={styles.container}><div className={styles.hero}><h1>Loading...</h1></div></div></>}>
      <NewEmployeeForm />
    </Suspense>
  );
}

function NewEmployeeForm() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Address autocomplete
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function fetchSuggestions(input) {
    if (!input || input.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch {
      // Silently fail
    }
  }

  function handleAddressInput(value) {
    setAddressQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  async function handleSelectSuggestion(suggestion) {
    setAddressQuery(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(suggestion.placeId)}`);
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          personal_address_line_1: data.address_line_1 || prev.personal_address_line_1,
          personal_city: data.city || prev.personal_city,
          personal_state: data.state || prev.personal_state,
          personal_postal_code: data.postal_code || prev.personal_postal_code,
        }));
      }
    } catch {
      // Silently fail
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/employees/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ref }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setFormError(data.error || "Failed to submit. Please try again.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  if (!ref) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.invalidState}>
                <svg className={styles.invalidIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h2>Invalid Link</h2>
                <p>This employee registration link is missing a referral code. Please use the link provided by your employer.</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.successState}>
                <svg className={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h2>Registration Complete</h2>
                <p>Your details have been submitted successfully. Your employer will review your information.</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.hero}>
          <h1>New Employee Registration</h1>
          <p>Please fill in all the required fields below to complete your employee registration.</p>
        </div>

        <div className={styles.card}>
          <form onSubmit={handleSubmit}>
            <div className={styles.cardBody}>
              {formError && <div className={styles.error}>{formError}</div>}
              <div className={styles.form}>

                {/* Personal Information */}
                <div className={styles.formSection}>Personal Information</div>

                <div className={styles.threeCol}>
                  <div className={styles.field}>
                    <label className={styles.label}>First Name *</label>
                    <input className={styles.input} type="text" value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Middle Name</label>
                    <input className={styles.input} type="text" value={form.middle_name} onChange={(e) => updateField("middle_name", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Last Name *</label>
                    <input className={styles.input} type="text" value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} required />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Gender *</label>
                    <select className={styles.select} value={form.gender} onChange={(e) => updateField("gender", e.target.value)} required>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Date of Birth *</label>
                    <input className={styles.input} type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} required />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Blood Type *</label>
                    <input className={styles.input} list="blood-types" value={form.blood_type} onChange={(e) => updateField("blood_type", e.target.value)} placeholder="Select or type" required />
                    <datalist id="blood-types">
                      <option value="A+" />
                      <option value="A-" />
                      <option value="B+" />
                      <option value="B-" />
                      <option value="AB+" />
                      <option value="AB-" />
                      <option value="O+" />
                      <option value="O-" />
                    </datalist>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Shirt Size *</label>
                    <select className={styles.select} value={form.shirt_size} onChange={(e) => updateField("shirt_size", e.target.value)} required>
                      <option value="">Select size</option>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                      <option value="XXXL">XXXL</option>
                    </select>
                  </div>
                </div>

                {/* Employment Details */}
                <div className={styles.formSection}>Employment Details</div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Employee ID</label>
                    <input className={styles.input} type="text" value={form.employee_number} onChange={(e) => updateField("employee_number", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Date of Joining *</label>
                    <input className={styles.input} type="date" value={form.date_of_joining} onChange={(e) => updateField("date_of_joining", e.target.value)} required />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Designation</label>
                    <input className={styles.input} type="text" value={form.designation} onChange={(e) => updateField("designation", e.target.value)} />
                    <span className={styles.noteText}>Please leave empty if not applicable</span>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Department</label>
                    <input className={styles.input} type="text" value={form.department} onChange={(e) => updateField("department", e.target.value)} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Employee Status *</label>
                    <select className={styles.select} value={form.employee_status} onChange={(e) => updateField("employee_status", e.target.value)} required>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Role *</label>
                    <input className={styles.input} type="text" value={form.role} onChange={(e) => updateField("role", e.target.value)} required />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Work Email *</label>
                    <input className={styles.input} type="email" value={form.work_email} onChange={(e) => updateField("work_email", e.target.value)} required />
                    <span className={styles.noteText}>Please use your personal email if a work email ID is not available</span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className={styles.formSection}>Contact Information</div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Personal Email *</label>
                    <input className={styles.input} type="email" value={form.personal_email} onChange={(e) => updateField("personal_email", e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Mobile Number *</label>
                    <input className={styles.input} type="tel" value={form.mobile_number} onChange={(e) => updateField("mobile_number", e.target.value)} required />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Emergency Mobile Number *</label>
                    <input className={styles.input} type="tel" value={form.mobile_number_emergency} onChange={(e) => updateField("mobile_number_emergency", e.target.value)} required />
                  </div>
                </div>

                {/* Address */}
                <div className={styles.formSection}>Address</div>

                <div className={styles.field} ref={suggestionsRef}>
                  <label className={styles.label}>Search Address</label>
                  <div className={styles.addressSearchWrap}>
                    <input
                      className={styles.addressSearch}
                      type="text"
                      placeholder="Start typing an address..."
                      value={addressQuery}
                      onChange={(e) => handleAddressInput(e.target.value)}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className={styles.suggestionsList}>
                        {suggestions.map((s) => (
                          <li key={s.placeId} className={styles.suggestionItem} onClick={() => handleSelectSuggestion(s)}>
                            {s.description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className={styles.hint}>Search to auto-fill the address fields below</span>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Address Line 1 *</label>
                    <input className={styles.input} type="text" value={form.personal_address_line_1} onChange={(e) => updateField("personal_address_line_1", e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Address Line 2 *</label>
                    <input className={styles.input} type="text" value={form.personal_address_line_2} onChange={(e) => updateField("personal_address_line_2", e.target.value)} required />
                  </div>
                </div>

                <div className={styles.threeCol}>
                  <div className={styles.field}>
                    <label className={styles.label}>City *</label>
                    <input className={styles.input} type="text" value={form.personal_city} onChange={(e) => updateField("personal_city", e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>State *</label>
                    <input className={styles.input} type="text" value={form.personal_state} onChange={(e) => updateField("personal_state", e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Postal Code *</label>
                    <input className={styles.input} type="text" value={form.personal_postal_code} onChange={(e) => updateField("personal_postal_code", e.target.value)} required />
                  </div>
                </div>

                {/* Identification */}
                <div className={styles.formSection}>Identification</div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Aadhaar Number *</label>
                    <input className={styles.input} type="text" value={form.aadhaar_number} onChange={(e) => updateField("aadhaar_number", e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>PAN Number *</label>
                    <input className={styles.input} type="text" value={form.pan_number} onChange={(e) => updateField("pan_number", e.target.value)} required style={{ textTransform: "uppercase" }} />
                  </div>
                </div>

              </div>
            </div>
            <div className={styles.cardFooter}>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Registration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

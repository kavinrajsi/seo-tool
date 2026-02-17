import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const REQUIRED_FIELDS = [
  "first_name", "last_name", "gender", "date_of_birth", "date_of_joining",
  "employee_status", "role", "work_email", "personal_email", "mobile_number",
  "mobile_number_emergency", "personal_address_line_1", "personal_address_line_2",
  "personal_city", "personal_state", "personal_postal_code", "aadhaar_number",
  "pan_number", "blood_type", "shirt_size",
];

const ALL_FIELDS = [
  "first_name", "middle_name", "last_name", "gender", "date_of_birth",
  "date_of_joining", "designation", "department", "employee_status", "role",
  "work_email", "personal_email", "mobile_number", "mobile_number_emergency",
  "personal_address_line_1", "personal_address_line_2", "personal_city",
  "personal_state", "personal_postal_code", "aadhaar_number", "pan_number",
  "blood_type", "shirt_size", "employee_number",
];

// Convert MM-DD-YYYY or MM/DD/YYYY to YYYY-MM-DD for database
function parseDate(val) {
  if (!val) return val;
  const trimmed = val.trim();
  // MM-DD-YYYY or MM/DD/YYYY
  const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const mm = match[1].padStart(2, "0");
    const dd = match[2].padStart(2, "0");
    return `${match[3]}-${mm}-${dd}`;
  }
  // Already YYYY-MM-DD
  return trimmed;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { employees } = body;

  if (!Array.isArray(employees) || employees.length === 0) {
    return NextResponse.json({ error: "No employees provided" }, { status: 400 });
  }

  if (employees.length > 500) {
    return NextResponse.json({ error: "Maximum 500 employees per import" }, { status: 400 });
  }

  // Fetch existing unique values for duplicate checking
  const { data: existingEmployees } = await admin
    .from("employees")
    .select("aadhaar_number, pan_number, work_email, mobile_number");

  const existingAadhaars = new Set((existingEmployees || []).map((e) => e.aadhaar_number));
  const existingPans = new Set((existingEmployees || []).map((e) => e.pan_number));
  const existingEmails = new Set((existingEmployees || []).map((e) => e.work_email));
  const existingMobiles = new Set((existingEmployees || []).map((e) => e.mobile_number));

  // Track duplicates within the batch
  const batchAadhaars = new Set();
  const batchPans = new Set();
  const batchEmails = new Set();
  const batchMobiles = new Set();

  // Fetch profiles for auto-linking (only for non-empty emails)
  const allWorkEmails = employees.map((e) => (e.work_email || "").trim().toLowerCase()).filter(Boolean);
  let profileMap = {};
  if (allWorkEmails.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("email", allWorkEmails);
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.email] = p.id;
      }
    }
  }

  const results = [];
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < employees.length; i++) {
    const row = employees[i];
    const rowNum = i + 1;

    // At least first_name or last_name must be present to create a row
    if (!(row.first_name || "").trim() && !(row.last_name || "").trim()) {
      errors.push({ row: rowNum, error: "At least first name or last name is required" });
      skipped++;
      continue;
    }

    const aadhaar = (row.aadhaar_number || "").trim();
    const pan = (row.pan_number || "").trim().toUpperCase();
    const email = (row.work_email || "").trim().toLowerCase();
    const mobile = (row.mobile_number || "").trim();

    // Check duplicates against existing DB (only when field is not empty)
    if (aadhaar && existingAadhaars.has(aadhaar)) {
      errors.push({ row: rowNum, error: `Duplicate Aadhaar number: ${aadhaar}` });
      skipped++;
      continue;
    }
    if (pan && existingPans.has(pan)) {
      errors.push({ row: rowNum, error: `Duplicate PAN number: ${pan}` });
      skipped++;
      continue;
    }
    if (email && existingEmails.has(email)) {
      errors.push({ row: rowNum, error: `Duplicate work email: ${email}` });
      skipped++;
      continue;
    }
    if (mobile && existingMobiles.has(mobile)) {
      errors.push({ row: rowNum, error: `Duplicate mobile number: ${mobile}` });
      skipped++;
      continue;
    }

    // Check duplicates within the batch
    if (aadhaar && batchAadhaars.has(aadhaar)) {
      errors.push({ row: rowNum, error: `Duplicate Aadhaar in batch: ${aadhaar}` });
      skipped++;
      continue;
    }
    if (pan && batchPans.has(pan)) {
      errors.push({ row: rowNum, error: `Duplicate PAN in batch: ${pan}` });
      skipped++;
      continue;
    }
    if (email && batchEmails.has(email)) {
      errors.push({ row: rowNum, error: `Duplicate email in batch: ${email}` });
      skipped++;
      continue;
    }
    if (mobile && batchMobiles.has(mobile)) {
      errors.push({ row: rowNum, error: `Duplicate mobile in batch: ${mobile}` });
      skipped++;
      continue;
    }

    if (aadhaar) batchAadhaars.add(aadhaar);
    if (pan) batchPans.add(pan);
    if (email) batchEmails.add(email);
    if (mobile) batchMobiles.add(mobile);

    const linkedProfileId = profileMap[email] || null;

    const val = (v) => v && v.trim() ? v.trim() : null;

    const insertData = {
      user_id: user.id,
      first_name: val(row.first_name) || "",
      middle_name: val(row.middle_name),
      last_name: val(row.last_name) || "",
      gender: val(row.gender),
      date_of_birth: parseDate(row.date_of_birth) || null,
      date_of_joining: parseDate(row.date_of_joining) || null,
      designation: val(row.designation),
      department: val(row.department),
      employee_status: val(row.employee_status) || "active",
      role: val(row.role) || "user",
      work_email: email || null,
      personal_email: val(row.personal_email) ? row.personal_email.trim().toLowerCase() : null,
      mobile_number: mobile || "",
      mobile_number_emergency: val(row.mobile_number_emergency) || "",
      personal_address_line_1: val(row.personal_address_line_1) || "",
      personal_address_line_2: val(row.personal_address_line_2) || "",
      personal_city: val(row.personal_city) || "",
      personal_state: val(row.personal_state) || "",
      personal_postal_code: val(row.personal_postal_code) || "",
      aadhaar_number: aadhaar || "",
      pan_number: pan || "",
      blood_type: val(row.blood_type),
      shirt_size: val(row.shirt_size),
      employee_number: val(row.employee_number),
      linked_profile_id: linkedProfileId,
    };

    const { error: insertErr } = await admin.from("employees").insert(insertData);

    if (insertErr) {
      errors.push({ row: rowNum, error: insertErr.message });
      skipped++;
    } else {
      imported++;
      // Add to existing sets so subsequent rows in batch catch duplicates
      if (aadhaar) existingAadhaars.add(aadhaar);
      if (pan) existingPans.add(pan);
      if (email) existingEmails.add(email);
      if (mobile) existingMobiles.add(mobile);
    }
  }

  return NextResponse.json({
    total: employees.length,
    imported,
    skipped,
    errors,
  });
}

// GET endpoint to return CSV template
export async function GET() {
  const headers = ALL_FIELDS.join(",");
  const sample = [
    "John,,Doe,Male,01-15-1990,01-01-2024,Software Engineer,Engineering,active,Developer,john@company.com,john@gmail.com,9876543210,9876543211,123 Main St,Apt 4,Chennai,Tamil Nadu,600001,123456789012,ABCDE1234F,O+,L,EMP001",
  ].join("\n");

  const csv = `${headers}\n${sample}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=employees_template.csv",
    },
  });
}

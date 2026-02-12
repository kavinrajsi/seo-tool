import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole } from "@/lib/projectAccess";
import { canEditProjectData } from "@/lib/permissions";

const VALID_BILLING_CYCLES = ["monthly", "quarterly", "yearly"];
const VALID_STATUSES = ["active", "cancelled", "expired"];
const VALID_CATEGORIES = ["SaaS", "Hosting", "Domain", "Security", "Analytics", "Design", "Marketing", "Communication", "Storage", "Development", "Other"];

const ALL_FIELDS = [
  "name", "vendor", "url", "category", "renewal_date", "billing_cycle",
  "cost", "payment_method", "status", "license_count", "alert_days_before", "notes",
];

const REQUIRED_FIELDS = ["name", "renewal_date", "billing_cycle", "cost"];

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
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

  const { renewals, projectId } = body;

  if (!Array.isArray(renewals) || renewals.length === 0) {
    return NextResponse.json({ error: "No renewals provided" }, { status: 400 });
  }

  if (renewals.length > 200) {
    return NextResponse.json({ error: "Maximum 200 renewals per import" }, { status: 400 });
  }

  if (projectId) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < renewals.length; i++) {
    const row = renewals[i];
    const rowNum = i + 1;

    const val = (v) => v && v.trim ? v.trim() : "";

    const name = val(row.name);
    if (!name) {
      errors.push({ row: rowNum, error: "name is required" });
      skipped++;
      continue;
    }

    const renewalDateRaw = val(row.renewal_date);
    const renewalDate = parseDate(renewalDateRaw);
    if (!renewalDate) {
      errors.push({ row: rowNum, error: "renewal_date is required and must be a valid date (MM-DD-YYYY, MM/DD/YYYY, or YYYY-MM-DD)" });
      skipped++;
      continue;
    }

    const billingCycle = val(row.billing_cycle).toLowerCase();
    if (!billingCycle || !VALID_BILLING_CYCLES.includes(billingCycle)) {
      errors.push({ row: rowNum, error: `billing_cycle must be one of: ${VALID_BILLING_CYCLES.join(", ")}` });
      skipped++;
      continue;
    }

    const costRaw = val(row.cost);
    const cost = parseFloat(costRaw);
    if (!costRaw || isNaN(cost) || cost < 0) {
      errors.push({ row: rowNum, error: "cost is required and must be a non-negative number" });
      skipped++;
      continue;
    }

    const status = val(row.status).toLowerCase() || "active";
    if (!VALID_STATUSES.includes(status)) {
      errors.push({ row: rowNum, error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
      skipped++;
      continue;
    }

    const category = val(row.category);
    if (category && !VALID_CATEGORIES.includes(category)) {
      errors.push({ row: rowNum, error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
      skipped++;
      continue;
    }

    const licenseCount = parseInt(val(row.license_count)) || 1;
    const alertDaysBefore = val(row.alert_days_before) !== "" ? parseInt(val(row.alert_days_before)) : 7;

    const insertData = {
      user_id: user.id,
      project_id: projectId || null,
      name,
      vendor: val(row.vendor) || null,
      url: val(row.url) || null,
      category: category || null,
      renewal_date: renewalDate,
      billing_cycle: billingCycle,
      cost: Math.round(cost * 100) / 100,
      payment_method: val(row.payment_method) || null,
      status,
      license_count: licenseCount > 0 ? licenseCount : 1,
      alert_days_before: isNaN(alertDaysBefore) ? 7 : alertDaysBefore,
      notes: val(row.notes) || null,
    };

    const { error: insertErr } = await admin.from("software_renewals").insert(insertData);

    if (insertErr) {
      errors.push({ row: rowNum, error: insertErr.message });
      skipped++;
    } else {
      imported++;
    }
  }

  return NextResponse.json({
    total: renewals.length,
    imported,
    skipped,
    errors,
  });
}

export async function GET() {
  const headers = ALL_FIELDS.join(",");
  const sample = "GitHub Team,GitHub,https://github.com,Development,01-15-2026,monthly,25.00,Visa ending 4242,active,10,7,Team plan for dev org";

  const csv = `${headers}\n${sample}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=software_renewals_template.csv",
    },
  });
}

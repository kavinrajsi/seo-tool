import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const DEFAULT_SETTINGS = {
  bulk_scan_max_urls: "10",
  daily_scan_limit: "0",
  sitemap_max_depth: "3",
  feature_bulk_scan: "true",
  feature_full_scan: "true",
  feature_pdf_export: "true",
  feature_google_oauth: "true",
  pagespeed_api_key: "",
  // Page visibility: "all" = everyone, "admin" = admin only
  page_seo: "all",
  page_qr_codes: "all",
  page_calendar: "all",
  page_ecommerce: "all",
  page_google_reviews: "all",
  page_instagram: "all",
  page_google_analytics: "all",
  page_software: "all",
  page_teams: "all",
  page_employees: "all",
  page_recruitsmart: "all",
  page_bulk_scan: "all",
  page_full_scan: "all",
  page_sitemap_creator: "all",
  page_usage: "all",
  page_score_history: "all",
  page_broken_links: "all",
  page_sitemap_visualizer: "all",
  page_domain_monitor: "all",
  page_url_shortener: "all",
  notification_sounds_enabled: "true",
};

const ALLOWED_KEYS = Object.keys(DEFAULT_SETTINGS);

async function verifyAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", status: 401 };

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Forbidden", status: 403 };

  return { admin };
}

export async function GET() {
  const result = await verifyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { admin } = result;

  const { data: rows, error } = await admin
    .from("app_settings")
    .select("key, value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If table is empty (first run), seed defaults
  if (!rows || rows.length === 0) {
    const inserts = ALLOWED_KEYS.map((key) => ({
      key,
      value: DEFAULT_SETTINGS[key],
    }));

    const { error: insertError } = await admin
      .from("app_settings")
      .insert(inserts);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ settings: { ...DEFAULT_SETTINGS } });
  }

  // Build flat object, filling in defaults for any missing keys
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

export async function PATCH(request) {
  const result = await verifyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { admin } = result;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { settings } = body;
  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "Missing settings object" }, { status: 400 });
  }

  // Validate keys
  const keys = Object.keys(settings);
  for (const key of keys) {
    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: `Invalid setting key: ${key}` }, { status: 400 });
    }
  }

  // Upsert each key-value pair
  for (const key of keys) {
    const value = String(settings[key]);
    const { error } = await admin
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

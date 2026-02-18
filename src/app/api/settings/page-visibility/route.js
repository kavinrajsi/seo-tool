import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const PAGE_KEYS = [
  // Main pages
  "page_seo",
  "page_qr_codes",
  "page_calendar",
  "page_ecommerce",
  "page_google_reviews",
  "page_instagram",
  "page_google_analytics",
  "page_software",
  "page_employees",
  "page_recruitsmart",
  // SEO sub-pages
  "page_bulk_scan",
  "page_full_scan",
  "page_sitemap_creator",
  "page_usage",
  "page_score_history",
  "page_broken_links",
  "page_sitemap_visualizer",
  "page_domain_monitor",
  "page_url_shortener",
];

const DEFAULT_VISIBILITY = {
  page_seo: "all",
  page_qr_codes: "all",
  page_calendar: "all",
  page_ecommerce: "all",
  page_google_reviews: "all",
  page_instagram: "all",
  page_google_analytics: "all",
  page_software: "all",
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
};

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Check user role
  let isAdmin = false;
  let isHr = false;
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
    isHr = profile?.role === "hr";
  }

  // Fetch page visibility settings
  const { data: rows } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", PAGE_KEYS);

  const settings = { ...DEFAULT_VISIBILITY };
  if (rows) {
    for (const row of rows) {
      settings[row.key] = row.value;
    }
  }

  // HR-specific pages: always visible to HR users
  const HR_PAGES = ["page_employees", "page_recruitsmart"];

  // Build visibility map: true if page is visible to current user
  const visibility = {};
  for (const key of PAGE_KEYS) {
    const setting = settings[key];
    // "all" = visible to everyone, "admin" = admin only
    // HR users always see employee/recruitsmart pages
    visibility[key] =
      setting === "all" ||
      (setting === "admin" && isAdmin) ||
      (isHr && HR_PAGES.includes(key));
  }

  return NextResponse.json({ visibility, isAdmin, isHr });
}

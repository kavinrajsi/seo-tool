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
  "page_teams",
  "page_employees",
  "page_recruitsmart",
  // SEO sub-pages
  "page_bulk_scan",
  "page_full_scan",
  "page_sitemap_creator",
  "page_usage",
  "page_score_history",
  "page_broken_links",
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
  page_teams: "all",
  page_employees: "all",
  page_recruitsmart: "all",
  page_bulk_scan: "all",
  page_full_scan: "all",
  page_sitemap_creator: "all",
  page_usage: "all",
  page_score_history: "all",
  page_broken_links: "all",
};

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
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

  // Build visibility map: true if page is visible to current user
  const visibility = {};
  for (const key of PAGE_KEYS) {
    const setting = settings[key];
    // "all" = visible to everyone, "admin" = admin only
    visibility[key] = setting === "all" || (setting === "admin" && isAdmin);
  }

  return NextResponse.json({ visibility, isAdmin });
}

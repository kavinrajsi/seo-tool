import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const PAGE_KEYS = [
  "page_bulk_scan",
  "page_full_scan",
  "page_teams",
  "page_usage",
  "page_qr_codes",
  "page_sitemap_creator",
  "page_ecommerce",
  "page_google_reviews",
];

const DEFAULT_VISIBILITY = {
  page_bulk_scan: "all",
  page_full_scan: "all",
  page_teams: "all",
  page_usage: "all",
  page_qr_codes: "all",
  page_sitemap_creator: "all",
  page_ecommerce: "all",
  page_google_reviews: "all",
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

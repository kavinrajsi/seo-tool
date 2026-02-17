import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const RESERVED_SLUGS = [
  "admin", "api", "app", "auth", "bio", "dashboard", "login", "register",
  "settings", "share", "terms", "privacy", "help", "support", "about",
];

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { slug, displayName, bioText, avatarUrl, theme } = body;

  if (!slug || !displayName) {
    return NextResponse.json({ error: "Slug and display name are required" }, { status: 400 });
  }

  const trimmedSlug = slug.trim().toLowerCase();

  if (trimmedSlug.length < 3 || trimmedSlug.length > 30) {
    return NextResponse.json({ error: "Slug must be 3-30 characters" }, { status: 400 });
  }

  if (!SLUG_REGEX.test(trimmedSlug)) {
    return NextResponse.json({ error: "Slug must contain only lowercase letters, numbers, and hyphens. Must start and end with a letter or number." }, { status: 400 });
  }

  if (RESERVED_SLUGS.includes(trimmedSlug)) {
    return NextResponse.json({ error: "This slug is reserved" }, { status: 400 });
  }

  // Check uniqueness (among non-deleted)
  const { data: existing } = await admin
    .from("bio_pages")
    .select("id")
    .eq("slug", trimmedSlug)
    .is("deleted_at", null)
    .single();

  if (existing) {
    return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
  }

  const { data, error } = await admin.from("bio_pages").insert({
    user_id: user.id,
    slug: trimmedSlug,
    display_name: displayName.trim(),
    bio_text: bioText?.trim() || null,
    avatar_url: avatarUrl?.trim() || null,
    theme: theme || { preset: "default" },
    views: 0,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let query = admin
    .from("bio_pages")
    .select("*, bio_links(count)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pages: data });
}

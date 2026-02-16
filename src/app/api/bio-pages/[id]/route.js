import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await admin
    .from("bio_pages")
    .select("*, bio_links(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Bio page not found" }, { status: 404 });
  }

  if (data.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sort links by position
  if (data.bio_links) {
    data.bio_links.sort((a, b) => a.position - b.position);
  }

  return NextResponse.json(data);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await admin
    .from("bio_pages")
    .select("id, user_id, slug")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Bio page not found" }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};

  if (body.displayName !== undefined) updates.display_name = body.displayName.trim();
  if (body.bioText !== undefined) updates.bio_text = body.bioText?.trim() || null;
  if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl?.trim() || null;
  if (body.theme !== undefined) updates.theme = body.theme;

  if (body.slug !== undefined) {
    const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    const trimmedSlug = body.slug.trim().toLowerCase();

    if (trimmedSlug.length < 3 || trimmedSlug.length > 30) {
      return NextResponse.json({ error: "Slug must be 3-30 characters" }, { status: 400 });
    }

    if (!SLUG_REGEX.test(trimmedSlug)) {
      return NextResponse.json({ error: "Slug must contain only lowercase letters, numbers, and hyphens" }, { status: 400 });
    }

    // Check uniqueness if slug changed
    if (trimmedSlug !== existing.slug) {
      const { data: slugTaken } = await admin
        .from("bio_pages")
        .select("id")
        .eq("slug", trimmedSlug)
        .is("deleted_at", null)
        .neq("id", id)
        .single();

      if (slugTaken) {
        return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
      }
    }

    updates.slug = trimmedSlug;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from("bio_pages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: existing } = await admin
    .from("bio_pages")
    .select("id, user_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Bio page not found" }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete
  const { error } = await admin
    .from("bio_pages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

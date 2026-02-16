import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function verifyOwnership(admin, supabase, bioPageId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", status: 401 };

  const { data: bioPage } = await admin
    .from("bio_pages")
    .select("id, user_id")
    .eq("id", bioPageId)
    .is("deleted_at", null)
    .single();

  if (!bioPage) return { error: "Bio page not found", status: 404 };
  if (bioPage.user_id !== user.id) return { error: "Forbidden", status: 403 };

  return { user };
}

export async function PATCH(request, { params }) {
  const { id, linkId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const auth = await verifyOwnership(admin, supabase, id);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const updates = {};

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.url !== undefined) updates.url = body.url.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.icon !== undefined) updates.icon = body.icon?.trim() || null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from("bio_links")
    .update(updates)
    .eq("id", linkId)
    .eq("bio_page_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const { id, linkId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const auth = await verifyOwnership(admin, supabase, id);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error } = await admin
    .from("bio_links")
    .delete()
    .eq("id", linkId)
    .eq("bio_page_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

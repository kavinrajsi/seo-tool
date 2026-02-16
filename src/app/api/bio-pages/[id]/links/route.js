import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify bio page ownership
  const { data: bioPage } = await admin
    .from("bio_pages")
    .select("id, user_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!bioPage) {
    return NextResponse.json({ error: "Bio page not found" }, { status: 404 });
  }

  if (bioPage.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, url, description, icon } = body;

  if (!title || !url) {
    return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
  }

  // Get max position
  const { data: maxRow } = await admin
    .from("bio_links")
    .select("position")
    .eq("bio_page_id", id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (maxRow?.position ?? -1) + 1;

  const { data, error } = await admin.from("bio_links").insert({
    bio_page_id: id,
    title: title.trim(),
    url: url.trim(),
    description: description?.trim() || null,
    icon: icon?.trim() || null,
    position,
    clicks: 0,
    is_active: true,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: bioPage } = await admin
    .from("bio_pages")
    .select("id, user_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!bioPage) {
    return NextResponse.json({ error: "Bio page not found" }, { status: 404 });
  }

  if (bioPage.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { order } = body;

  if (!order || !Array.isArray(order)) {
    return NextResponse.json({ error: "order array is required" }, { status: 400 });
  }

  // Update positions
  for (const item of order) {
    const { error } = await admin
      .from("bio_links")
      .update({ position: item.position })
      .eq("id", item.id)
      .eq("bio_page_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

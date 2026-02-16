import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request) {
  const admin = createAdminClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { pageId } = body;

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  const { data: page } = await admin
    .from("bio_pages")
    .select("id, views")
    .eq("id", pageId)
    .is("deleted_at", null)
    .single();

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Increment view count (fire and forget)
  admin
    .from("bio_pages")
    .update({ views: (page.views || 0) + 1 })
    .eq("id", pageId)
    .then(() => {});

  return NextResponse.json({ success: true });
}

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

  const { linkId } = body;

  if (!linkId) {
    return NextResponse.json({ error: "linkId is required" }, { status: 400 });
  }

  const { data: link } = await admin
    .from("bio_links")
    .select("id, clicks")
    .eq("id", linkId)
    .single();

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Increment click count (fire and forget)
  admin
    .from("bio_links")
    .update({ clicks: (link.clicks || 0) + 1 })
    .eq("id", linkId)
    .then(() => {});

  return NextResponse.json({ success: true });
}

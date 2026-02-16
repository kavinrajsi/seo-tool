import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: shortUrl, error } = await admin
    .from("short_urls")
    .select("id, original_url, clicks")
    .eq("code", code)
    .is("deleted_at", null)
    .single();

  if (error || !shortUrl) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Increment click count (fire and forget)
  admin
    .from("short_urls")
    .update({ clicks: (shortUrl.clicks || 0) + 1 })
    .eq("id", shortUrl.id)
    .then(() => {});

  return NextResponse.redirect(shortUrl.original_url, 302);
}

import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function getDeviceType(ua) {
  if (!ua) return "desktop";
  const lower = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(lower)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/.test(lower)) return "mobile";
  return "desktop";
}

export async function GET(request, { params }) {
  const { shortCode } = await params;
  const admin = createAdminClient();

  const { data: qr, error } = await admin
    .from("qr_codes")
    .select("id, content, original_url")
    .eq("short_code", shortCode)
    .single();

  if (error || !qr) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }

  const ua = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";

  // Insert scan event (fire-and-forget, don't block redirect)
  admin.from("qr_scans").insert({
    qr_code_id: qr.id,
    user_agent: ua.slice(0, 500),
    referer: referer.slice(0, 500),
    device_type: getDeviceType(ua),
  }).then(() => {});

  const destination = qr.original_url || qr.content;
  return NextResponse.redirect(destination, 302);
}

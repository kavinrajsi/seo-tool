import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: Redirect to destination URL and log scan event
export async function GET(req, { params }) {
  const { slug } = await params;
  const db = getSupabase();

  // Look up the QR code by slug
  const { data: qr } = await db
    .rpc("get_qr_by_slug", { p_slug: slug });

  if (!qr) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }

  // Extract tracking info from request
  const userAgent = req.headers.get("user-agent") || "";
  const referer = req.headers.get("referer") || "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  // Extract UTM params from the scan URL (if appended)
  const url = new URL(req.url);
  const utmSource = url.searchParams.get("utm_source") || qr.utm_source || "";
  const utmMedium = url.searchParams.get("utm_medium") || qr.utm_medium || "";
  const utmCampaign = url.searchParams.get("utm_campaign") || qr.utm_campaign || "";

  // Log scan event asynchronously
  db.rpc("track_qr_event", {
    p_qr_code_id: qr.id,
    p_event_type: "scan",
    p_user_agent: userAgent,
    p_ip_address: ip,
    p_referer: referer,
    p_utm_source: utmSource,
    p_utm_medium: utmMedium,
    p_utm_campaign: utmCampaign,
  }).then(() => {});

  // Build destination URL with UTM parameters
  let destination = qr.destination_url;
  try {
    const destUrl = new URL(destination);
    if (utmSource) destUrl.searchParams.set("utm_source", utmSource);
    if (utmMedium) destUrl.searchParams.set("utm_medium", utmMedium);
    if (utmCampaign) destUrl.searchParams.set("utm_campaign", utmCampaign);
    destination = destUrl.toString();
  } catch {
    // destination_url might not be a valid URL (e.g., vcard, tel:, mailto:)
  }

  return NextResponse.redirect(destination, 302);
}

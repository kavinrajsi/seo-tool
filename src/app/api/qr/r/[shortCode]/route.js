import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function getDeviceType(ua) {
  if (!ua) return "desktop";
  const lower = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(lower)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/.test(lower)) return "mobile";
  return "desktop";
}

function parseUserAgent(ua) {
  if (!ua) return { os: "Unknown", browser: "Unknown" };
  let os = "Unknown";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";
  else if (/CrOS/.test(ua)) os = "ChromeOS";

  let browser = "Unknown";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";

  return { os, browser };
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
  const { os, browser } = parseUserAgent(ua);

  // Extract IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || null;

  // Extract geo data from Vercel headers
  const rawCity = request.headers.get("x-vercel-ip-city");
  const city = rawCity ? decodeURIComponent(rawCity) : null;
  const region = request.headers.get("x-vercel-ip-country-region") || null;
  const country = request.headers.get("x-vercel-ip-country") || null;
  const lat = request.headers.get("x-vercel-ip-latitude");
  const lng = request.headers.get("x-vercel-ip-longitude");
  const latitude = lat ? parseFloat(lat) : null;
  const longitude = lng ? parseFloat(lng) : null;

  // Insert scan event before redirecting
  const { error: scanError } = await admin.from("qr_scans").insert({
    qr_code_id: qr.id,
    user_agent: ua.slice(0, 500),
    referer: referer.slice(0, 500),
    device_type: getDeviceType(ua),
    ip_address: ipAddress,
    city,
    region,
    country,
    latitude,
    longitude,
    os,
    browser,
  });

  if (scanError) {
    console.error("Failed to record QR scan:", scanError.message, scanError.details);
  }

  const destination = qr.original_url || qr.content;
  return NextResponse.redirect(destination, 302);
}

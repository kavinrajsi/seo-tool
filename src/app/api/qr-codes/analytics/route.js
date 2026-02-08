import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch user's QR codes
  const { data: qrCodes, error: qrError } = await admin
    .from("qr_codes")
    .select("id, content, label, short_code, original_url, background_color, squares_color, pixels_color, style, pattern, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (qrError) {
    return NextResponse.json({ error: qrError.message }, { status: 500 });
  }

  const qrCodeIds = qrCodes.map((qr) => qr.id);

  if (qrCodeIds.length === 0) {
    return NextResponse.json({
      totalQrCodes: 0,
      trackableCount: 0,
      totalScans: 0,
      scansToday: 0,
      dailyScans: [],
      qrCodes: [],
      deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
      scansByHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
      scansByOS: {},
      scansByBrowser: {},
      scansByCountry: {},
      topCities: [],
      locationClusters: [],
    });
  }

  // Fetch all scans for user's QR codes
  const { data: scans, error: scansError } = await admin
    .from("qr_scans")
    .select("id, qr_code_id, scanned_at, device_type, city, region, country, latitude, longitude, os, browser, ip_address")
    .in("qr_code_id", qrCodeIds)
    .order("scanned_at", { ascending: false });

  if (scansError) {
    return NextResponse.json({ error: scansError.message }, { status: 500 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Aggregate stats
  const totalScans = scans.length;
  const scansToday = scans.filter((s) => new Date(s.scanned_at) >= todayStart).length;
  const trackableCount = qrCodes.filter((qr) => qr.short_code).length;

  // Device breakdown
  const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 };
  for (const scan of scans) {
    const dt = scan.device_type || "desktop";
    if (deviceBreakdown[dt] !== undefined) {
      deviceBreakdown[dt]++;
    }
  }

  // Daily scans for last 30 days
  const dailyScans = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const count = scans.filter((s) => {
      const d = new Date(s.scanned_at);
      return d >= date && d < nextDate;
    }).length;
    dailyScans.push({ date: dateStr, count });
  }

  // Per-QR code breakdown
  const scansByQr = {};
  for (const scan of scans) {
    if (!scansByQr[scan.qr_code_id]) {
      scansByQr[scan.qr_code_id] = { count: 0, lastScan: scan.scanned_at };
    }
    scansByQr[scan.qr_code_id].count++;
  }

  // Scans by hour of day (0-23)
  const scansByHour = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  for (const scan of scans) {
    const hour = new Date(scan.scanned_at).getHours();
    scansByHour[hour].count++;
  }

  // OS breakdown
  const scansByOS = {};
  for (const scan of scans) {
    const os = scan.os || "Unknown";
    scansByOS[os] = (scansByOS[os] || 0) + 1;
  }

  // Browser breakdown
  const scansByBrowser = {};
  for (const scan of scans) {
    const browser = scan.browser || "Unknown";
    scansByBrowser[browser] = (scansByBrowser[browser] || 0) + 1;
  }

  // Country breakdown
  const scansByCountry = {};
  for (const scan of scans) {
    if (scan.country) {
      scansByCountry[scan.country] = (scansByCountry[scan.country] || 0) + 1;
    }
  }

  // Top cities
  const cityMap = {};
  for (const scan of scans) {
    if (scan.city) {
      const key = `${scan.city}|${scan.region || ""}|${scan.country || ""}`;
      if (!cityMap[key]) {
        cityMap[key] = { city: scan.city, region: scan.region || "", country: scan.country || "", count: 0 };
      }
      cityMap[key].count++;
    }
  }
  const topCities = Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 20);

  // Location clusters (rounded to 1 decimal ≈ 11km)
  const clusterMap = {};
  for (const scan of scans) {
    if (scan.latitude != null && scan.longitude != null) {
      const lat = Math.round(scan.latitude * 10) / 10;
      const lng = Math.round(scan.longitude * 10) / 10;
      const key = `${lat},${lng}`;
      if (!clusterMap[key]) {
        clusterMap[key] = { latitude: lat, longitude: lng, count: 0 };
      }
      clusterMap[key].count++;
    }
  }
  const locationClusters = Object.values(clusterMap).sort((a, b) => b.count - a.count);

  const qrCodesWithStats = qrCodes.map((qr) => ({
    ...qr,
    total_scans: scansByQr[qr.id]?.count || 0,
    last_scan_at: scansByQr[qr.id]?.lastScan || null,
  })).sort((a, b) => b.total_scans - a.total_scans);

  return NextResponse.json({
    totalQrCodes: qrCodes.length,
    trackableCount,
    totalScans,
    scansToday,
    dailyScans,
    qrCodes: qrCodesWithStats,
    deviceBreakdown,
    scansByHour,
    scansByOS,
    scansByBrowser,
    scansByCountry,
    topCities,
    locationClusters,
  });
}

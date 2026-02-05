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

  // Total analyses (this user)
  const { count: totalAnalyses } = await admin
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // This month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: monthlyAnalyses } = await admin
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  // Today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count: todayAnalyses } = await admin
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString());

  // Recent activity (last 10)
  const { data: recentLogs } = await admin
    .from("usage_logs")
    .select("url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Unique URLs analyzed (this user)
  const { data: uniqueUrls } = await admin
    .from("reports")
    .select("url")
    .eq("user_id", user.id);

  const uniqueCount = new Set(uniqueUrls?.map((r) => r.url)).size;

  return NextResponse.json({
    totalAnalyses: totalAnalyses || 0,
    monthlyAnalyses: monthlyAnalyses || 0,
    todayAnalyses: todayAnalyses || 0,
    uniqueUrls: uniqueCount,
    recentLogs: recentLogs || [],
  });
}

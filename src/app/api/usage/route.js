import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Total analyses (this user)
    const { count: totalAnalyses, error: totalErr } = await admin
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (totalErr) {
      // Table might not exist — fall back to reports-based stats
      return fallbackStats(admin, user.id);
    }

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

    // Recent activity (last 20)
    const { data: recentLogs } = await admin
      .from("usage_logs")
      .select("url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Attach most recent report ID, score, and severity counts for each unique URL
    const uniqueLogUrls = [...new Set((recentLogs || []).map((l) => l.url))];
    const reportDataMap = {};
    if (uniqueLogUrls.length > 0) {
      const { data: reportRows } = await admin
        .from("reports")
        .select("id, url, overall_score, results_json")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .in("url", uniqueLogUrls)
        .order("created_at", { ascending: false });
      for (const r of reportRows || []) {
        if (!reportDataMap[r.url]) {
          reportDataMap[r.url] = {
            report_id: r.id,
            overall_score: r.overall_score,
            counts: computeSeverityCounts(r.results_json),
            sslEnabled: r.results_json?.sslHttps?.score === "pass",
            httpsRedirect: r.results_json?.httpsRedirect?.score || null,
          };
        }
      }
    }

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
      recentLogs: (recentLogs || []).map((l) => {
        const rd = reportDataMap[l.url];
        return {
          ...l,
          report_id: rd?.report_id || null,
          overall_score: rd?.overall_score ?? null,
          counts: rd?.counts || null,
          sslEnabled: rd?.sslEnabled ?? null,
          httpsRedirect: rd?.httpsRedirect ?? null,
        };
      }),
    });
  } catch (err) {
    console.error("Usage API error:", err);
    return NextResponse.json(
      { error: "Failed to load usage data" },
      { status: 500 }
    );
  }
}

function computeSeverityCounts(resultsJson) {
  if (!resultsJson || typeof resultsJson !== "object") return { fail: 0, warning: 0, pass: 0 };
  let fail = 0, warning = 0, pass = 0;
  for (const key of Object.keys(resultsJson)) {
    const score = resultsJson[key]?.score;
    if (score === "fail") fail++;
    else if (score === "warning") warning++;
    else pass++;
  }
  return { fail, warning, pass };
}

// Fallback: derive stats from the reports table if usage_logs doesn't exist
async function fallbackStats(admin, userId) {
  try {
    const { data: reports } = await admin
      .from("reports")
      .select("id, url, created_at, overall_score, results_json")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const rows = reports || [];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthlyAnalyses = rows.filter(
      (r) => new Date(r.created_at) >= startOfMonth
    ).length;

    const todayAnalyses = rows.filter(
      (r) => new Date(r.created_at) >= startOfDay
    ).length;

    const uniqueCount = new Set(rows.map((r) => r.url)).size;

    const recentLogs = rows.slice(0, 20).map((r) => ({
      url: r.url,
      created_at: r.created_at,
      report_id: r.id || null,
      overall_score: r.overall_score ?? null,
      counts: computeSeverityCounts(r.results_json),
      sslEnabled: r.results_json?.sslHttps?.score === "pass",
      httpsRedirect: r.results_json?.httpsRedirect?.score || null,
    }));

    return NextResponse.json({
      totalAnalyses: rows.length,
      monthlyAnalyses,
      todayAnalyses,
      uniqueUrls: uniqueCount,
      recentLogs,
    });
  } catch {
    return NextResponse.json({
      totalAnalyses: 0,
      monthlyAnalyses: 0,
      todayAnalyses: 0,
      uniqueUrls: 0,
      recentLogs: [],
    });
  }
}

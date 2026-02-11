import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole, getAccessibleProjectIds } from "@/lib/projectAccess";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") || "";
  const days = parseInt(searchParams.get("days") || "90", 10);
  const projectId = searchParams.get("projectId") || "";

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Fetch all reports for this user within the date range
  let query = admin
    .from("reports")
    .select("id, url, overall_score, fail_count, warning_count, pass_count, created_at, results_json, project_id")
    .is("deleted_at", null)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (projectId === "all") {
    const accessibleIds = await getAccessibleProjectIds(user.id);
    if (accessibleIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project_id.in.(${accessibleIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
  } else if (projectId && projectId !== "personal") {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    query = query.eq("project_id", projectId);
  } else {
    query = query.eq("user_id", user.id).is("project_id", null);
  }

  if (url) {
    query = query.ilike("url", `%${url}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reports = (data || []).map((r) => ({
    id: r.id,
    url: r.url,
    overall_score: r.overall_score,
    fail_count: r.fail_count,
    warning_count: r.warning_count,
    pass_count: r.pass_count,
    created_at: r.created_at,
    ssl_enabled: r.results_json?.sslHttps?.score === "pass",
    https_redirect: r.results_json?.httpsRedirect?.score || null,
  }));

  // Unique URLs scanned
  const urls = [...new Set(reports.map((r) => r.url))];

  // Build per-URL history: for each URL, the chronological scores
  const urlHistory = {};
  reports.forEach((r) => {
    if (!urlHistory[r.url]) urlHistory[r.url] = [];
    urlHistory[r.url].push({
      id: r.id,
      score: r.overall_score,
      fail: r.fail_count,
      warning: r.warning_count,
      pass: r.pass_count,
      date: r.created_at,
    });
  });

  // Detect regressions: score dropped by 5+ points between consecutive scans
  const regressions = [];
  for (const [rUrl, entries] of Object.entries(urlHistory)) {
    for (let i = 1; i < entries.length; i++) {
      const drop = entries[i - 1].score - entries[i].score;
      if (drop >= 5) {
        regressions.push({
          url: rUrl,
          from: entries[i - 1].score,
          to: entries[i].score,
          drop,
          date: entries[i].date,
          reportId: entries[i].id,
        });
      }
    }
  }

  // Compute summary stats
  const totalScans = reports.length;
  const avgScore = totalScans > 0
    ? Math.round(reports.reduce((s, r) => s + r.overall_score, 0) / totalScans)
    : 0;

  // Best and worst scores
  let bestScore = 0;
  let worstScore = 100;
  reports.forEach((r) => {
    if (r.overall_score > bestScore) bestScore = r.overall_score;
    if (r.overall_score < worstScore) worstScore = r.overall_score;
  });
  if (totalScans === 0) {
    bestScore = 0;
    worstScore = 0;
  }

  // Trend: compare average of first half vs second half
  let trend = "stable";
  if (reports.length >= 2) {
    const mid = Math.floor(reports.length / 2);
    const firstHalf = reports.slice(0, mid);
    const secondHalf = reports.slice(mid);
    const avgFirst = firstHalf.reduce((s, r) => s + r.overall_score, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, r) => s + r.overall_score, 0) / secondHalf.length;
    const diff = avgSecond - avgFirst;
    if (diff >= 3) trend = "improving";
    else if (diff <= -3) trend = "declining";
  }

  return NextResponse.json({
    reports,
    urls,
    urlHistory,
    regressions,
    stats: {
      totalScans,
      avgScore,
      bestScore,
      worstScore,
      trend,
      uniqueUrls: urls.length,
    },
  });
}

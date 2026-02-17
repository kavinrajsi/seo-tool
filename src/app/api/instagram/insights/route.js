import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  const admin = createAdminClient();
  let connQuery = admin.from("instagram_connections").select("*").eq("user_id", user.id);
  if (projectId) { connQuery = connQuery.eq("project_id", projectId); } else { connQuery = connQuery.is("project_id", null); }
  const { data: connection } = await connQuery.maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 404 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token expired. Please reconnect Instagram." }, { status: 401 });
  }

  // Fetch 30-day account-level insights
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);

  const metrics = "impressions,reach,follower_count,profile_views";
  const insightsRes = await fetch(
    `https://graph.facebook.com/v21.0/${connection.instagram_user_id}/insights?metric=${metrics}&period=day&since=${since}&until=${until}&access_token=${accessToken}`
  );

  if (!insightsRes.ok) {
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 502 });
  }

  const insightsData = await insightsRes.json();
  const metricsData = insightsData.data || [];

  // Build daily insights map keyed by date
  const dailyMap = {};

  for (const metric of metricsData) {
    const values = metric.values || [];
    for (const v of values) {
      const date = v.end_time?.split("T")[0];
      if (!date) continue;
      if (!dailyMap[date]) {
        dailyMap[date] = { date, impressions: 0, reach: 0, follower_count: 0, profile_views: 0 };
      }
      dailyMap[date][metric.name] = v.value || 0;
    }
  }

  const dailyInsights = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

  // Upsert daily insights into database
  const upsertRows = dailyInsights.map((d) => ({
    user_id: user.id,
    date: d.date,
    impressions: d.impressions,
    reach: d.reach,
    follower_count: d.follower_count,
    profile_views: d.profile_views,
    synced_at: new Date().toISOString(),
  }));

  if (upsertRows.length > 0) {
    await admin
      .from("instagram_insights")
      .upsert(upsertRows, { onConflict: "user_id,date" });
  }

  // Compute summary
  const totalImpressions = dailyInsights.reduce((sum, d) => sum + d.impressions, 0);
  const totalReach = dailyInsights.reduce((sum, d) => sum + d.reach, 0);
  const totalProfileViews = dailyInsights.reduce((sum, d) => sum + d.profile_views, 0);

  // Follower growth: last day's count - first day's count
  const sortedAsc = [...dailyInsights].sort((a, b) => a.date.localeCompare(b.date));
  const followerGrowth = sortedAsc.length >= 2
    ? sortedAsc[sortedAsc.length - 1].follower_count - sortedAsc[0].follower_count
    : 0;

  const avgDailyProfileViews = dailyInsights.length > 0
    ? Math.round(totalProfileViews / dailyInsights.length)
    : 0;

  return NextResponse.json({
    insights: dailyInsights,
    summary: {
      totalImpressions,
      totalReach,
      followerGrowth,
      avgDailyProfileViews,
      daysTracked: dailyInsights.length,
    },
  });
}

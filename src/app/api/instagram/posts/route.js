import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("instagram_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 404 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token expired. Please reconnect Instagram." }, { status: 401 });
  }

  // Fetch recent media
  const mediaRes = await fetch(
    `https://graph.facebook.com/v21.0/${connection.instagram_user_id}/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count&limit=50&access_token=${accessToken}`
  );

  if (!mediaRes.ok) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 502 });
  }

  const mediaData = await mediaRes.json();
  const posts = mediaData.data || [];

  // Fetch insights for each post (Business/Creator accounts only)
  const postsWithInsights = await Promise.all(
    posts.map(async (post) => {
      let insights = { impressions: 0, reach: 0, saved: 0, engagement: 0 };
      try {
        const metrics = post.media_type === "VIDEO"
          ? "impressions,reach,saved,video_views"
          : "impressions,reach,saved";
        const insightsRes = await fetch(
          `https://graph.facebook.com/v21.0/${post.id}/insights?metric=${metrics}&access_token=${accessToken}`
        );
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          for (const metric of insightsData.data || []) {
            insights[metric.name] = metric.values?.[0]?.value || 0;
          }
        }
      } catch {
        // Non-critical — continue without insights for this post
      }

      insights.engagement = (post.like_count || 0) + (post.comments_count || 0) + (insights.saved || 0);

      return {
        id: post.id,
        mediaType: post.media_type,
        mediaUrl: post.media_url,
        thumbnailUrl: post.thumbnail_url,
        permalink: post.permalink,
        caption: post.caption,
        timestamp: post.timestamp,
        likeCount: post.like_count || 0,
        commentsCount: post.comments_count || 0,
        impressions: insights.impressions,
        reach: insights.reach,
        saved: insights.saved,
        engagement: insights.engagement,
      };
    })
  );

  // Upsert posts into database
  const upsertRows = postsWithInsights.map((p) => ({
    user_id: user.id,
    instagram_media_id: p.id,
    media_type: p.mediaType,
    media_url: p.mediaUrl,
    thumbnail_url: p.thumbnailUrl,
    permalink: p.permalink,
    caption: p.caption,
    timestamp: p.timestamp,
    like_count: p.likeCount,
    comments_count: p.commentsCount,
    impressions: p.impressions,
    reach: p.reach,
    engagement: p.engagement,
    saved: p.saved,
    synced_at: new Date().toISOString(),
  }));

  if (upsertRows.length > 0) {
    await admin
      .from("instagram_posts")
      .upsert(upsertRows, { onConflict: "user_id,instagram_media_id" });
  }

  // Compute stats
  const totalLikes = postsWithInsights.reduce((sum, p) => sum + p.likeCount, 0);
  const totalComments = postsWithInsights.reduce((sum, p) => sum + p.commentsCount, 0);
  const avgEngagement = postsWithInsights.length > 0
    ? postsWithInsights.reduce((sum, p) => sum + p.engagement, 0) / postsWithInsights.length
    : 0;

  return NextResponse.json({
    posts: postsWithInsights,
    stats: {
      totalPosts: postsWithInsights.length,
      totalLikes,
      totalComments,
      avgEngagement: Math.round(avgEngagement * 10) / 10,
    },
  });
}

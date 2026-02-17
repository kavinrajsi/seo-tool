import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: reviews, error } = await admin
    .from("product_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = reviews || [];
  const totalReviews = all.length;

  if (totalReviews === 0) {
    return NextResponse.json({
      totalReviews: 0,
      avgRating: 0,
      avgSentiment: 0,
      reviewsThisMonth: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
      sourceBreakdown: {},
      dailyReviews: [],
      monthlySentiment: [],
      topProducts: [],
    });
  }

  const avgRating = Math.round((all.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10;
  const avgSentiment = Math.round((all.reduce((s, r) => s + (parseFloat(r.sentiment_score) || 0), 0) / totalReviews) * 1000) / 1000;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const reviewsThisMonth = all.filter((r) => new Date(r.created_at) >= monthStart).length;

  // Rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of all) {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
  }

  // Sentiment breakdown
  const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 };
  for (const r of all) {
    const s = r.sentiment || "neutral";
    sentimentBreakdown[s] = (sentimentBreakdown[s] || 0) + 1;
  }

  // Source breakdown
  const sourceBreakdown = {};
  for (const r of all) {
    const src = r.source || "manual";
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
  }

  // Daily reviews (last 30 days)
  const dailyReviews = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const count = all.filter((r) => {
      const d = new Date(r.created_at);
      return d >= date && d < nextDate;
    }).length;
    dailyReviews.push({ date: dateStr, count });
  }

  // Monthly sentiment (last 6 months)
  const monthlySentiment = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const monthReviews = all.filter((r) => {
      const d = new Date(r.created_at);
      return d >= monthDate && d < nextMonth;
    });
    const positive = monthReviews.filter((r) => r.sentiment === "positive").length;
    const negative = monthReviews.filter((r) => r.sentiment === "negative").length;
    const neutral = monthReviews.filter((r) => r.sentiment === "neutral").length;
    monthlySentiment.push({ month: monthLabel, positive, negative, neutral });
  }

  // Top products by review count
  const productCounts = {};
  for (const r of all) {
    const name = r.product_title || "Unknown";
    if (!productCounts[name]) {
      productCounts[name] = { count: 0, totalRating: 0 };
    }
    productCounts[name].count++;
    productCounts[name].totalRating += r.rating;
  }
  const topProducts = Object.entries(productCounts)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgRating: Math.round((data.totalRating / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    totalReviews,
    avgRating,
    avgSentiment,
    reviewsThisMonth,
    ratingDistribution,
    sentimentBreakdown,
    sourceBreakdown,
    dailyReviews,
    monthlySentiment,
    topProducts,
  });
}

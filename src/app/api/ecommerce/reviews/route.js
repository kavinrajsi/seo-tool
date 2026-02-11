import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeSentiment } from "@/lib/sentiment";
import { NextResponse } from "next/server";
import { getUserProjectRole, getAccessibleProjectIds } from "@/lib/projectAccess";
import { canEditProjectData } from "@/lib/permissions";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";

  let query = admin
    .from("product_reviews")
    .select("*")
    .order("created_at", { ascending: false });

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

  const source = searchParams.get("source");
  if (source) {
    query = query.eq("source", source);
  }

  const { data: reviews, error } = await query;

  if (error) {
    console.error("[Reviews API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = reviews || [];
  const totalReviews = all.length;
  const avgRating = totalReviews > 0
    ? Math.round((all.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
    : 0;
  const positiveCount = all.filter((r) => r.sentiment === "positive").length;
  const negativeCount = all.filter((r) => r.sentiment === "negative").length;
  const neutralCount = all.filter((r) => r.sentiment === "neutral").length;
  const pendingCount = all.filter((r) => r.status === "pending").length;
  const flaggedCount = all.filter((r) => r.status === "flagged").length;

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of all) {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
  }

  const sourceBreakdown = {};
  for (const r of all) {
    const src = r.source || "manual";
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
  }

  return NextResponse.json({
    reviews: all,
    stats: {
      totalReviews,
      avgRating,
      positiveCount,
      negativeCount,
      neutralCount,
      pendingCount,
      flaggedCount,
      ratingDistribution,
      sourceBreakdown,
    },
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { product_title, reviewer_name, reviewer_email, rating, title, body: reviewBody, source, projectId } = body;

  if (!reviewer_name || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Reviewer name and rating (1-5) are required" }, { status: 400 });
  }

  // Verify project access if projectId provided
  if (projectId) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  const textToAnalyze = [title, reviewBody].filter(Boolean).join(" ");
  const { sentiment, score: sentimentScore } = analyzeSentiment(textToAnalyze);

  // Auto-flag negative reviews (rating <= 2 or negative sentiment)
  const autoFlag = rating <= 2 || sentiment === "negative";
  const status = autoFlag ? "flagged" : "pending";

  const { data: review, error } = await admin
    .from("product_reviews")
    .insert({
      user_id: user.id,
      project_id: projectId || null,
      product_title: product_title || null,
      reviewer_name,
      reviewer_email: reviewer_email || null,
      rating,
      title: title || null,
      body: reviewBody || null,
      source: source || "manual",
      sentiment,
      sentiment_score: sentimentScore,
      status,
    })
    .select()
    .single();

  if (error) {
    console.error("[Reviews API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeSentiment } from "@/lib/sentiment";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { placeId, projectId } = body;
  if (!placeId || typeof placeId !== "string") {
    return NextResponse.json({ error: "Place ID is required" }, { status: 400 });
  }

  // Fetch reviews with both sort orders in parallel to maximize coverage
  const referer = request.headers.get("origin") || request.headers.get("referer") || "https://localhost:3000";
  const encodedPlaceId = encodeURIComponent(placeId);
  const baseUrl = `https://places.googleapis.com/v1/places/${encodedPlaceId}`;
  const commonHeaders = {
    "X-Goog-Api-Key": apiKey,
    "Referer": referer,
  };

  const [relevantRes, newestRes] = await Promise.all([
    fetch(baseUrl, {
      headers: { ...commonHeaders, "X-Goog-FieldMask": "reviews" },
    }),
    fetch(`${baseUrl}?reviews_sort=newest`, {
      headers: { ...commonHeaders, "X-Goog-FieldMask": "reviews" },
    }),
  ]);

  if (!relevantRes.ok) {
    const errData = await relevantRes.json().catch(() => ({}));
    console.error("[Places API] Fetch error:", errData);
    const msg = errData?.error?.message || "Failed to fetch reviews from Google Places";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const relevantData = await relevantRes.json();
  const relevantReviews = relevantData.reviews || [];

  let newestReviews = [];
  if (newestRes.ok) {
    const newestData = await newestRes.json();
    newestReviews = newestData.reviews || [];
  }

  // Deduplicate by review name (ID)
  const seen = new Set();
  const allReviews = [];
  for (const review of [...relevantReviews, ...newestReviews]) {
    const id = review.name;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    allReviews.push(review);
  }

  const admin = createAdminClient();
  let imported = 0;
  let skipped = 0;
  let flagged = 0;

  for (const review of allReviews) {
    const googleReviewId = review.name || null;

    // Deduplication check against DB
    if (googleReviewId) {
      const { data: existing } = await admin
        .from("product_reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("google_review_id", googleReviewId)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }
    }

    const rating = review.rating || 3;
    const reviewText = review.originalText?.text || review.text?.text || "";
    const reviewerName = review.authorAttribution?.displayName || "Google User";

    const { sentiment, score: sentimentScore } = analyzeSentiment(reviewText);
    const autoFlag = rating <= 2 || sentiment === "negative";
    const status = autoFlag ? "flagged" : "pending";
    if (autoFlag) flagged++;

    const reviewDate = review.publishTime
      ? new Date(review.publishTime).toISOString()
      : new Date().toISOString();

    await admin.from("product_reviews").insert({
      user_id: user.id,
      project_id: projectId || null,
      google_review_id: googleReviewId,
      reviewer_name: reviewerName,
      reviewer_email: null,
      rating,
      title: null,
      body: reviewText || null,
      source: "google",
      sentiment,
      sentiment_score: sentimentScore,
      status,
      review_date: reviewDate,
    });

    imported++;
  }

  return NextResponse.json({
    totalFetched: allReviews.length,
    imported,
    skipped,
    flagged,
  });
}

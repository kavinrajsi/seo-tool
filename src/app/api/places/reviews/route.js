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

  const { placeId } = body;
  if (!placeId || typeof placeId !== "string") {
    return NextResponse.json({ error: "Place ID is required" }, { status: 400 });
  }

  // Fetch place details with reviews from Places API (New)
  const origin = request.headers.get("origin") || request.headers.get("referer") || "https://localhost:3000";
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "reviews",
      "Referer": origin,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error("[Places API] Fetch error:", errData);
    const msg = errData?.error?.message || "Failed to fetch reviews from Google Places";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const data = await res.json();
  const reviews = data.reviews || [];

  const admin = createAdminClient();
  let imported = 0;
  let skipped = 0;
  let flagged = 0;

  for (const review of reviews) {
    const googleReviewId = review.name || null;

    // Deduplication check
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
    totalFetched: reviews.length,
    imported,
    skipped,
    flagged,
  });
}

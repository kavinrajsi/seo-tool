import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";
import { analyzeSentiment } from "@/lib/sentiment";

const STAR_RATING_MAP = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("gbp_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Google Business Profile not connected" }, { status: 404 });
  }

  if (!connection.location_id) {
    return NextResponse.json({ error: "No location selected. Please select a business location first." }, { status: 400 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
  }

  // Fetch all reviews with pagination
  let allReviews = [];
  let nextPageToken = null;

  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${connection.location_id}/reviews`);
    url.searchParams.set("pageSize", "50");
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("[GBP Reviews] Fetch error:", errData);
      return NextResponse.json({ error: "Failed to fetch Google reviews" }, { status: 502 });
    }

    const data = await res.json();
    allReviews = allReviews.concat(data.reviews || []);
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);

  // Process and import reviews
  let imported = 0;
  let skipped = 0;
  let flagged = 0;

  for (const review of allReviews) {
    const googleReviewId = review.reviewId;

    // Check for existing review (deduplication)
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

    const rating = STAR_RATING_MAP[review.starRating] || 3;
    const reviewText = review.comment || "";
    const reviewerName = review.reviewer?.displayName || "Google User";

    const { sentiment, score: sentimentScore } = analyzeSentiment(reviewText);
    const autoFlag = rating <= 2 || sentiment === "negative";
    const status = autoFlag ? "flagged" : "pending";
    if (autoFlag) flagged++;

    const reviewDate = review.createTime
      ? new Date(review.createTime).toISOString()
      : new Date().toISOString();

    // Import existing Google reply if present
    const responseText = review.reviewReply?.comment || null;
    const respondedAt = review.reviewReply?.updateTime
      ? new Date(review.reviewReply.updateTime).toISOString()
      : null;
    const reviewStatus = responseText ? "responded" : status;

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
      status: reviewStatus,
      response_text: responseText,
      responded_at: respondedAt,
      review_date: reviewDate,
    });

    imported++;
  }

  // Update last_synced_at
  await admin
    .from("gbp_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return NextResponse.json({
    totalFetched: allReviews.length,
    imported,
    skipped,
    flagged,
  });
}

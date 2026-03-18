import { NextResponse } from "next/server";
import { google } from "googleapis";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedClient } from "@/lib/google";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, locationId, pageToken } = await req.json();

    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Not connected to Google" }, { status: 403 });
    }

    const origin = new URL(req.url).origin;
    const auth = getAuthenticatedClient(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: tokenRow.expiry_date,
      },
      `${origin}/api/google/callback`
    );

    // If no accountId, list accounts first
    if (!accountId) {
      const mybusiness = google.mybusinessaccountmanagement({ version: "v1", auth });
      const accountsRes = await mybusiness.accounts.list();
      const accounts = (accountsRes.data.accounts || []).map((a) => ({
        name: a.name,
        accountName: a.accountName,
        type: a.type,
      }));
      return NextResponse.json({ accounts });
    }

    // If no locationId, list locations
    if (!locationId) {
      const mybusinessInfo = google.mybusinessbusinessinformation({ version: "v1", auth });
      const locationsRes = await mybusinessInfo.accounts.locations.list({
        parent: accountId,
        readMask: "name,title,storefrontAddress",
        pageSize: 100,
      });
      const locations = (locationsRes.data.locations || []).map((l) => ({
        name: l.name,
        title: l.title,
        address: l.storefrontAddress
          ? [l.storefrontAddress.addressLines?.[0], l.storefrontAddress.locality, l.storefrontAddress.regionCode]
              .filter(Boolean)
              .join(", ")
          : "",
      }));
      return NextResponse.json({ locations });
    }

    // Fetch reviews for location
    const mybusiness = google.mybusinessaccountmanagement({ version: "v1", auth });
    const reviewsUrl = `https://mybusiness.googleapis.com/v4/${locationId}/reviews`;
    const reviewsRes = await auth.request({
      url: reviewsUrl,
      params: { pageSize: 50, pageToken: pageToken || undefined },
    });

    const reviewsData = reviewsRes.data;
    const reviews = (reviewsData.reviews || []).map((r) => ({
      reviewId: r.reviewId,
      reviewer: r.reviewer?.displayName || "Anonymous",
      profilePhotoUrl: r.reviewer?.profilePhotoUrl || null,
      starRating: r.starRating,
      comment: r.comment || "",
      createTime: r.createTime,
      updateTime: r.updateTime,
      reply: r.reviewReply
        ? { comment: r.reviewReply.comment, updateTime: r.reviewReply.updateTime }
        : null,
    }));

    const averageRating = reviewsData.averageRating || 0;
    const totalReviewCount = reviewsData.totalReviewCount || 0;

    // Store in Supabase
    try {
      await supabase.from("google_reviews").upsert(
        {
          user_id: user.id,
          location_id: locationId,
          source: "business_profile",
          average_rating: averageRating,
          total_reviews: totalReviewCount,
          reviews,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,location_id" }
      );
    } catch {
      // Store is optional
    }

    return NextResponse.json({
      reviews,
      averageRating,
      totalReviewCount,
      nextPageToken: reviewsData.nextPageToken || null,
    });
  } catch (err) {
    console.error("Business reviews error:", err);
    const msg = err.message || "Failed to fetch reviews";
    if (msg.includes("insufficient") || msg.includes("scope") || msg.includes("403")) {
      return NextResponse.json(
        { error: "Missing Google Business Profile permission. Please reconnect Google with updated permissions.", needsReauth: true },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

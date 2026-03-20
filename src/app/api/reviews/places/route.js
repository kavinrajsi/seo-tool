import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { apiKey, query, placeId } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Google Places API key is required" }, { status: 400 });
    }

    // If no placeId, search for place first
    if (!placeId && query) {
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
      );
      const searchData = await searchRes.json();

      if (searchData.status !== "OK") {
        return NextResponse.json(
          { error: searchData.error_message || `Places API error: ${searchData.status}` },
          { status: 400 }
        );
      }

      const places = (searchData.results || []).slice(0, 10).map((p) => ({
        placeId: p.place_id,
        name: p.name,
        address: p.formatted_address,
        rating: p.rating || 0,
        totalRatings: p.user_ratings_total || 0,
        types: p.types?.slice(0, 3) || [],
      }));

      return NextResponse.json({ places });
    }

    // Fetch place details with reviews
    if (!placeId) {
      return NextResponse.json({ error: "Place ID or search query is required" }, { status: 400 });
    }

    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,reviews,types,website,formatted_phone_number,opening_hours,url,price_level&key=${apiKey}&reviews_sort=newest`
    );
    const detailsData = await detailsRes.json();

    if (detailsData.status !== "OK") {
      return NextResponse.json(
        { error: detailsData.error_message || `Places API error: ${detailsData.status}` },
        { status: 400 }
      );
    }

    const place = detailsData.result;
    const reviews = (place.reviews || []).map((r) => ({
      authorName: r.author_name,
      authorUrl: r.author_url,
      profilePhotoUrl: r.profile_photo_url,
      rating: r.rating,
      text: r.text || "",
      time: r.time,
      relativeTime: r.relative_time_description,
      language: r.language,
    }));

    // Compute star breakdown
    const starBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (starBreakdown[r.rating] !== undefined) starBreakdown[r.rating]++;
    });

    const result = {
      name: place.name,
      address: place.formatted_address,
      rating: place.rating || 0,
      totalRatings: place.user_ratings_total || 0,
      reviews,
      starBreakdown,
      website: place.website || null,
      phone: place.formatted_phone_number || null,
      googleMapsUrl: place.url || null,
      types: place.types?.slice(0, 5) || [],
      priceLevel: place.price_level,
      openNow: place.opening_hours?.open_now,
    };

    // Store in Supabase if user is logged in
    try {
      const auth = await getUserFromRequest(req);
      if (auth) {
        const { user, supabase } = auth;
        await supabase.from("google_reviews").upsert(
          {
            user_id: user.id,
            location_id: placeId,
            source: "places_api",
            business_name: place.name,
            average_rating: place.rating || 0,
            total_reviews: place.user_ratings_total || 0,
            reviews,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "user_id,location_id" }
        );
      }
    } catch (err) {
      logError("reviews-places/store", err);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Places reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch reviews" }, { status: 500 });
  }
}

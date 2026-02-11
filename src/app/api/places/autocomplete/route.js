import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input");
  if (!input || input.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["in"],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Places Autocomplete] Error:", err);
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();
    const suggestions = (data.suggestions || [])
      .filter((s) => s.placePrediction)
      .map((s) => ({
        placeId: s.placePrediction.placeId,
        description: s.placePrediction.text?.text || s.placePrediction.structuredFormat?.mainText?.text || "",
      }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[Places Autocomplete] Fetch error:", err.message);
    return NextResponse.json({ suggestions: [] });
  }
}

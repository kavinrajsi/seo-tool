import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "addressComponents,formattedAddress",
        },
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Places Details] Error:", err);
      return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 });
    }

    const data = await res.json();
    const components = data.addressComponents || [];

    let address_line_1 = "";
    let city = "";
    let state = "";
    let postal_code = "";

    const streetNumber = components.find((c) => c.types?.includes("street_number"))?.longText || "";
    const route = components.find((c) => c.types?.includes("route"))?.longText || "";
    const sublocality = components.find((c) => c.types?.includes("sublocality") || c.types?.includes("sublocality_level_1"))?.longText || "";
    const premise = components.find((c) => c.types?.includes("premise"))?.longText || "";

    address_line_1 = [streetNumber, premise, route, sublocality].filter(Boolean).join(", ") || data.formattedAddress || "";
    city = components.find((c) => c.types?.includes("locality"))?.longText || "";
    state = components.find((c) => c.types?.includes("administrative_area_level_1"))?.longText || "";
    postal_code = components.find((c) => c.types?.includes("postal_code"))?.longText || "";

    return NextResponse.json({
      address_line_1,
      city,
      state,
      postal_code,
      formatted_address: data.formattedAddress || "",
    });
  } catch (err) {
    console.error("[Places Details] Fetch error:", err.message);
    return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 });
  }
}

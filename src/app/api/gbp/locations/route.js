import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";
import { getProjectConnection } from "@/lib/projectConnections";

// In-memory cache: userId -> { locations, selectedLocationId, cachedAt }
const locationsCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";

  const admin = createAdminClient();
  const connection = await getProjectConnection(user.id, projectId, "gbp_connections");

  if (!connection) {
    return NextResponse.json({ error: "Google Business Profile not connected" }, { status: 404 });
  }

  const forceRefresh = searchParams.get("refresh") === "true";

  // Serve from in-memory cache if available and not expired
  const cached = locationsCache.get(user.id);
  if (!forceRefresh && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      locations: cached.locations,
      selectedLocationId: connection.location_id || null,
      cached: true,
    });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
  }

  // Fetch GBP accounts
  const accountsRes = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!accountsRes.ok) {
    let detail = "";
    try {
      const errBody = await accountsRes.json();
      detail = errBody.error?.message || JSON.stringify(errBody);
      console.error("GBP accounts fetch failed:", accountsRes.status, errBody);
    } catch {
      console.error("GBP accounts fetch failed:", accountsRes.status);
    }

    // If rate-limited and we have stale cache, serve it
    if (accountsRes.status === 429 && cached) {
      return NextResponse.json({
        locations: cached.locations,
        selectedLocationId: connection.location_id || null,
        cached: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch GBP accounts", detail, status: accountsRes.status },
      { status: 502 }
    );
  }

  const accountsData = await accountsRes.json();
  const locations = [];

  for (const account of accountsData.accounts || []) {
    // account.name is like "accounts/12345"
    const locationsRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (locationsRes.ok) {
      const locationsData = await locationsRes.json();
      for (const loc of locationsData.locations || []) {
        locations.push({
          accountId: account.name,
          locationId: loc.name,
          locationName: loc.title || loc.name,
          address: loc.storefrontAddress
            ? [
                loc.storefrontAddress.addressLines?.join(", "),
                loc.storefrontAddress.locality,
                loc.storefrontAddress.administrativeArea,
              ]
                .filter(Boolean)
                .join(", ")
            : null,
        });
      }
    }
  }

  // Store in memory cache
  locationsCache.set(user.id, { locations, cachedAt: Date.now() });

  return NextResponse.json({
    locations,
    selectedLocationId: connection.location_id || null,
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { accountId, locationId, locationName } = await request.json();
  if (!accountId || !locationId) {
    return NextResponse.json({ error: "Account ID and Location ID are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: dbError } = await admin
    .from("gbp_connections")
    .update({
      account_id: accountId,
      location_id: locationId,
      location_name: locationName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Failed to save location" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

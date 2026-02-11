import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";
import { getProjectConnection } from "@/lib/projectConnections";

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";

  const admin = createAdminClient();
  const connection = await getProjectConnection(user.id, projectId, "ga_connections");

  if (!connection) {
    return NextResponse.json({ error: "Google Analytics not connected" }, { status: 404 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
  }

  // Fetch GA4 account summaries
  const res = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch GA4 properties" }, { status: 502 });
  }

  const data = await res.json();
  const properties = [];

  for (const account of data.accountSummaries || []) {
    for (const prop of account.propertySummaries || []) {
      // prop.property is like "properties/12345"
      const propertyId = prop.property?.replace("properties/", "");
      properties.push({
        propertyId,
        displayName: prop.displayName,
        accountName: account.displayName,
      });
    }
  }

  return NextResponse.json({
    properties,
    selectedPropertyId: connection.property_id || null,
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { propertyId } = await request.json();
  if (!propertyId) {
    return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: dbError } = await admin
    .from("ga_connections")
    .update({
      property_id: propertyId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Failed to save property" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

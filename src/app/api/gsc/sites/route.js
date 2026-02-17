import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("gsc_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "Search Console not connected" }, { status: 404 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
  }

  // Fetch verified sites from GSC
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch sites from Search Console" }, { status: 502 });
  }

  const data = await res.json();
  const sites = (data.siteEntry || []).map((entry) => ({
    siteUrl: entry.siteUrl,
    permissionLevel: entry.permissionLevel,
  }));

  return NextResponse.json({
    sites,
    selectedSiteUrl: connection.property_id || null,
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { siteUrl } = await request.json();
  if (!siteUrl) {
    return NextResponse.json({ error: "Site URL is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: dbError } = await admin
    .from("gsc_connections")
    .update({
      property_id: siteUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Failed to save site" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

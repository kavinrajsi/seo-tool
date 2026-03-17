import { NextResponse } from "next/server";
import { google } from "googleapis";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedClient } from "@/lib/google";

export async function GET(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Not connected" }, { status: 403 });
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

    // Fetch GA4 properties
    const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth });
    const accountsRes = await analyticsAdmin.accounts.list();
    const accounts = accountsRes.data.accounts || [];

    const properties = [];
    for (const account of accounts) {
      const propsRes = await analyticsAdmin.properties.list({
        filter: `parent:${account.name}`,
      });
      for (const prop of propsRes.data.properties || []) {
        properties.push({
          id: prop.name.replace("properties/", ""),
          name: prop.displayName,
          account: account.displayName,
        });
      }
    }

    // Fetch Search Console sites
    const searchConsole = google.searchconsole({ version: "v1", auth });
    const sitesRes = await searchConsole.sites.list();
    const sites = (sitesRes.data.siteEntry || []).map((s) => ({
      url: s.siteUrl,
      permission: s.permissionLevel,
    }));

    return NextResponse.json({ properties, sites });
  } catch (err) {
    console.error("Properties fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

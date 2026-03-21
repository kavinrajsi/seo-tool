import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getAuthenticatedClient } from "@/lib/google";
import { logError } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, supabase } = auth;

    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Not connected" }, { status: 403 });
    }

    const origin = new URL(req.url).origin;
    const googleAuth = getAuthenticatedClient(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: tokenRow.expiry_date,
      },
      `${origin}/api/google/callback`
    );

    // Fetch GA4 properties and Search Console sites independently
    let properties = [];
    let sites = [];

    // GA4 properties
    try {
      const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: googleAuth });
      const accountsRes = await analyticsAdmin.accounts.list();
      const accounts = accountsRes.data.accounts || [];

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
    } catch (err) {
      logError("ga/properties/analytics", err);
    }

    // Search Console sites
    try {
      const searchConsole = google.searchconsole({ version: "v1", auth: googleAuth });
      const sitesRes = await searchConsole.sites.list();
      sites = (sitesRes.data.siteEntry || []).map((s) => ({
        url: s.siteUrl,
        permission: s.permissionLevel,
      }));
    } catch (err) {
      logError("ga/properties/search-console", err);
    }

    return NextResponse.json({ properties, sites });
  } catch (err) {
    logError("ga/properties", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

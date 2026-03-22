import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getAuthenticatedClient } from "@/lib/google";
import { logError } from "@/lib/logger";

export const maxDuration = 30;

export async function POST(request) {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const body = await request.json();
    let { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Please provide a domain to check." }, { status: 400 });
    }

    domain = domain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
    if (!domain) {
      return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
    }

    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tokenRow) {
      return NextResponse.json({ error: "Google not connected. Connect Google in Analytics settings to get real backlink data." }, { status: 403 });
    }

    const origin = new URL(request.url).origin;
    const googleAuth = getAuthenticatedClient(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: tokenRow.expiry_date,
      },
      `${origin}/api/google/callback`
    );

    const searchconsole = google.searchconsole({ version: "v1", auth: googleAuth });

    // Try both URL formats GSC might use
    const siteUrl = `sc-domain:${domain}`;
    const siteUrlAlt = `https://${domain}/`;

    let linksData = null;
    let usedSiteUrl = siteUrl;

    // Try sc-domain format first
    try {
      const [externalLinks, internalLinks] = await Promise.all([
        searchconsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate: getDateString(-90),
            endDate: getDateString(0),
            dimensions: ["page"],
            rowLimit: 100,
          },
        }),
        searchconsole.urlInspection?.index?.inspect?.({
          siteUrl,
        }).catch(() => null),
      ]);

      // Get external links to site
      const extLinksRes = await searchconsole.links.list({ siteUrl });
      linksData = extLinksRes.data;
      usedSiteUrl = siteUrl;
    } catch {
      // Try https:// format
      try {
        const extLinksRes = await searchconsole.links.list({ siteUrl: siteUrlAlt });
        linksData = extLinksRes.data;
        usedSiteUrl = siteUrlAlt;
      } catch (err) {
        return NextResponse.json({
          error: `Domain "${domain}" not found in your Google Search Console. Make sure it's verified in GSC.`,
        }, { status: 404 });
      }
    }

    // Process external links (backlinks to your site)
    const externalLinks = linksData?.externalLinks || [];
    const backlinks = [];

    for (const link of externalLinks) {
      // Each link has: siteUrl (referring domain), linkCount
      const referring = link.siteUrl || "";
      const referringDomain = referring.replace(/^https?:\/\//, "").replace(/\/+$/, "");

      backlinks.push({
        sourceUrl: referring,
        sourceDomain: referringDomain,
        anchorText: referringDomain,
        authority: 0,
        type: "follow",
        quality: "good",
        linkCount: link.linkCount || 1,
        firstSeen: "",
        lastSeen: "",
      });
    }

    // Sort by link count
    backlinks.sort((a, b) => b.linkCount - a.linkCount);

    // Process internal links
    const internalLinksData = linksData?.internalLinks || [];

    // Build summary
    const totalBacklinks = backlinks.reduce((sum, b) => sum + b.linkCount, 0);
    const referringDomains = backlinks.length;

    // Build referring domains list
    const topReferringDomains = backlinks.slice(0, 20).map((b) => ({
      domain: b.sourceDomain,
      authority: 0,
      backlinks: b.linkCount,
      type: "follow",
    }));

    // Build anchor text data from GSC
    let anchorTexts = [];
    try {
      // GSC doesn't directly give anchor texts, but we can get top linking pages
      // Use search analytics for page-level data instead
    } catch {}

    const data = {
      domain,
      summary: {
        totalBacklinks,
        referringDomains,
        domainAuthority: 0,
        newLast30Days: 0,
        lostLast30Days: 0,
        followRatio: 100,
        internalLinks: internalLinksData.length,
      },
      backlinks: backlinks.slice(0, 100),
      referringDomains: topReferringDomains,
      anchorTexts,
      trend: [],
      toxicLinks: [],
      isDemo: false,
      source: "Google Search Console",
    };

    return NextResponse.json(data);
  } catch (err) {
    logError("backlinks/process", err);
    return NextResponse.json({ error: "Failed to fetch backlink data." }, { status: 500 });
  }
}

function getDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

import { tool } from "ai";
import { z } from "zod";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/google";
import { analyzeUrl } from "@/lib/seo-analyzer";

/**
 * Create AI SDK tools that operate on the user's connected Google data.
 * @param {{ supabase: object, user: object, origin: string }} ctx
 */
export function createSEOTools(ctx) {
  const { supabase, user, origin } = ctx;

  async function getGoogleAuth() {
    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (!tokenRow) return null;
    return getAuthenticatedClient(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: tokenRow.expiry_date,
      },
      `${origin}/api/google/callback`
    );
  }

  return {
    getAnalyticsData: tool({
      description: "Fetch Google Analytics traffic data for a property. Returns sessions, users, page views, bounce rate, and top pages over a date range.",
      parameters: z.object({
        propertyId: z.string().describe("GA4 property ID (e.g. 'properties/123456789')"),
        dateRange: z.string().default("30").describe("Number of days to look back (default: 30)"),
      }),
      execute: async ({ propertyId, dateRange }) => {
        const googleAuth = await getGoogleAuth();
        if (!googleAuth) return { error: "Google account not connected. Connect it from the Analytics page." };

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - Number(dateRange));
        const start = startDate.toISOString().split("T")[0];
        const end = endDate.toISOString().split("T")[0];

        const analyticsData = google.analyticsdata({ version: "v1beta", auth: googleAuth });

        const [overviewRes, pagesRes] = await Promise.all([
          analyticsData.properties.runReport({
            property: propertyId,
            requestBody: {
              dateRanges: [{ startDate: start, endDate: end }],
              metrics: [
                { name: "sessions" },
                { name: "totalUsers" },
                { name: "screenPageViews" },
                { name: "bounceRate" },
                { name: "averageSessionDuration" },
              ],
            },
          }),
          analyticsData.properties.runReport({
            property: propertyId,
            requestBody: {
              dateRanges: [{ startDate: start, endDate: end }],
              dimensions: [{ name: "pagePath" }],
              metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
              orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
              limit: 10,
            },
          }),
        ]);

        const overview = overviewRes.data.rows?.[0]?.metricValues || [];
        const topPages = (pagesRes.data.rows || []).map((r) => ({
          page: r.dimensionValues[0].value,
          views: Number(r.metricValues[0].value),
          users: Number(r.metricValues[1].value),
        }));

        return {
          dateRange: `${start} to ${end}`,
          sessions: Number(overview[0]?.value || 0),
          users: Number(overview[1]?.value || 0),
          pageViews: Number(overview[2]?.value || 0),
          bounceRate: Number(overview[3]?.value || 0).toFixed(2) + "%",
          avgSessionDuration: Number(overview[4]?.value || 0).toFixed(1) + "s",
          topPages,
        };
      },
    }),

    getSearchConsoleData: tool({
      description: "Fetch Google Search Console data for a site. Returns total clicks, impressions, average CTR, position, and top queries/pages.",
      parameters: z.object({
        siteUrl: z.string().describe("Site URL as registered in Search Console (e.g. 'https://example.com' or 'sc-domain:example.com')"),
        dateRange: z.string().default("30").describe("Number of days to look back (default: 30)"),
      }),
      execute: async ({ siteUrl, dateRange }) => {
        const googleAuth = await getGoogleAuth();
        if (!googleAuth) return { error: "Google account not connected." };

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - Number(dateRange));
        const start = startDate.toISOString().split("T")[0];
        const end = endDate.toISOString().split("T")[0];

        const searchconsole = google.searchconsole({ version: "v1", auth: googleAuth });

        const [queryRes, pageRes] = await Promise.all([
          searchconsole.searchanalytics.query({
            siteUrl,
            requestBody: {
              startDate: start, endDate: end,
              dimensions: ["query"],
              rowLimit: 10,
            },
          }),
          searchconsole.searchanalytics.query({
            siteUrl,
            requestBody: {
              startDate: start, endDate: end,
              dimensions: ["page"],
              rowLimit: 10,
            },
          }),
        ]);

        const topQueries = (queryRes.data.rows || []).map((r) => ({
          query: r.keys[0],
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(2) + "%",
          position: r.position.toFixed(1),
        }));

        const topPages = (pageRes.data.rows || []).map((r) => ({
          page: r.keys[0],
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(2) + "%",
          position: r.position.toFixed(1),
        }));

        return { dateRange: `${start} to ${end}`, topQueries, topPages };
      },
    }),

    getGoogleReviews: tool({
      description: "Fetch Google Reviews for a business using the Places API. Returns rating, total reviews, and individual reviews.",
      parameters: z.object({
        query: z.string().describe("Business name to search for (e.g. 'Madarth Chennai')"),
      }),
      execute: async ({ query }) => {
        // Prefer server key, then client env var, then DB
        let apiKey = process.env.GOOGLE_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "";
        if (!apiKey) {
          const { data: prefs } = await supabase
            .from("user_preferences")
            .select("places_api_key")
            .eq("user_id", user.id)
            .single();
          apiKey = prefs?.places_api_key || "";
        }

        if (!apiKey) {
          return { error: "No Google Places API key configured. Add one from the Google Reviews page." };
        }

        const searchRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
        );
        const searchData = await searchRes.json();
        if (searchData.status !== "OK" || !searchData.results?.length) {
          return { error: `No results found for "${query}"` };
        }

        const placeId = searchData.results[0].place_id;
        const detailRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${apiKey}`
        );
        const detailData = await detailRes.json();
        const place = detailData.result;

        return {
          name: place.name,
          rating: place.rating,
          totalReviews: place.user_ratings_total,
          reviews: (place.reviews || []).slice(0, 5).map((r) => ({
            author: r.author_name,
            rating: r.rating,
            text: r.text?.slice(0, 200),
            time: r.relative_time_description,
          })),
        };
      },
    }),

    analyzeSEO: tool({
      description: "Run a full SEO analysis on a URL. Returns score, category scores, and all checks (on-page, technical, content, images, security, structured data, resources).",
      parameters: z.object({
        url: z.string().describe("URL to analyze (e.g. 'example.com' or 'https://example.com')"),
      }),
      execute: async ({ url }) => {
        const analysis = await analyzeUrl(url);
        return {
          url: analysis.url,
          score: analysis.score,
          categoryScores: analysis.category_scores,
          title: analysis.title,
          metaDescription: analysis.meta_description,
          wordCount: analysis.word_count,
          h1s: analysis.h1s,
          totalImages: analysis.total_images,
          imagesWithAlt: analysis.images_with_alt,
          internalLinks: analysis.internal_links,
          externalLinks: analysis.external_links,
          keywords: analysis.keywords,
          checks: analysis.checks.filter((c) => c.status !== "pass").map((c) => ({
            name: c.name,
            status: c.status,
            message: c.message,
            category: c.category,
          })),
        };
      },
    }),

    listGAProperties: tool({
      description: "List all Google Analytics 4 properties accessible by the connected Google account.",
      parameters: z.object({}),
      execute: async () => {
        const googleAuth = await getGoogleAuth();
        if (!googleAuth) return { error: "Google account not connected." };

        const admin = google.analyticsadmin({ version: "v1beta", auth: googleAuth });
        const res = await admin.properties.list({
          filter: "parent:accounts/-",
          showDeleted: false,
        });

        return (res.data.properties || []).map((p) => ({
          propertyId: p.name,
          displayName: p.displayName,
          websiteUrl: p.industryCategory || "",
        }));
      },
    }),

    listSearchConsoleSites: tool({
      description: "List all sites verified in Google Search Console.",
      parameters: z.object({}),
      execute: async () => {
        const googleAuth = await getGoogleAuth();
        if (!googleAuth) return { error: "Google account not connected." };

        const searchconsole = google.searchconsole({ version: "v1", auth: googleAuth });
        const res = await searchconsole.sites.list();

        return (res.data.siteEntry || []).map((s) => ({
          siteUrl: s.siteUrl,
          permissionLevel: s.permissionLevel,
        }));
      },
    }),
  };
}

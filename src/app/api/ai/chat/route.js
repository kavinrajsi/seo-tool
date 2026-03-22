import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getAuthenticatedClient } from "@/lib/google";
import { analyzeUrl } from "@/lib/seo-analyzer";
import { logError } from "@/lib/logger";
import { MARKETING_SKILLS } from "@/lib/marketing-skills";

export const maxDuration = 60;

const SYSTEM_MSG = `You are an expert SEO and SMO (Social Media Optimization) assistant. You specialize in:

**SEO:** On-page SEO, technical SEO, keyword research, content optimization, link building, schema markup, Core Web Vitals, local SEO, international SEO, crawlability, indexing, site speed, and search engine algorithms.

**SMO:** Social media strategy, content planning, platform-specific optimization (Instagram, LinkedIn, Twitter/X, Facebook, YouTube), hashtag research, engagement tactics, social signals, brand awareness, influencer outreach, and social media analytics.

You have access to tools to fetch real data from the user's Google Analytics and Search Console accounts, and to run SEO analysis on any URL. Use these tools when the user asks about their site's traffic, rankings, search performance, or SEO health.

Guidelines:
- Always provide specific, actionable recommendations
- When you have real data from tools, reference it in your analysis
- Format responses with clear headings, bullet points, and numbered steps
- Be thorough but concise`;

const TOOLS = [
  {
    name: "get_analytics_data",
    description: "Fetch Google Analytics traffic data for a property. Returns sessions, users, page views, bounce rate, top pages, traffic sources, and countries.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "GA4 property ID (e.g. 'properties/123456789')" },
        dateRange: { type: "string", description: "Number of days to look back (default: 30)" },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "get_search_console_data",
    description: "Fetch Google Search Console data for a site. Returns top queries, top pages, clicks, impressions, CTR, and average position.",
    input_schema: {
      type: "object",
      properties: {
        siteUrl: { type: "string", description: "Site URL as registered in Search Console (e.g. 'https://example.com' or 'sc-domain:example.com')" },
        dateRange: { type: "string", description: "Number of days to look back (default: 30)" },
      },
      required: ["siteUrl"],
    },
  },
  {
    name: "list_ga_properties",
    description: "List all Google Analytics 4 properties accessible by the connected Google account.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_search_console_sites",
    description: "List all sites verified in Google Search Console.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "analyze_seo",
    description: "Run a full SEO analysis on any URL. Returns score, category scores, and all checks (on-page, technical, content, images, security, structured data).",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to analyze (e.g. 'example.com')" },
      },
      required: ["url"],
    },
  },
];

async function getGoogleAuth(supabase, userId, origin) {
  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
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

async function executeTool(name, input, { supabase, user, origin }) {
  const googleAuth = await getGoogleAuth(supabase, user.id, origin);

  switch (name) {
    case "list_ga_properties": {
      if (!googleAuth) return { error: "Google not connected. Connect from Analytics page." };
      const admin = google.analyticsadmin({ version: "v1beta", auth: googleAuth });
      const res = await admin.properties.list({ filter: "parent:accounts/-", showDeleted: false });
      return (res.data.properties || []).map((p) => ({ propertyId: p.name, name: p.displayName }));
    }

    case "list_search_console_sites": {
      if (!googleAuth) return { error: "Google not connected." };
      const sc = google.searchconsole({ version: "v1", auth: googleAuth });
      const res = await sc.sites.list();
      return (res.data.siteEntry || []).map((s) => ({ siteUrl: s.siteUrl, permission: s.permissionLevel }));
    }

    case "get_analytics_data": {
      if (!googleAuth) return { error: "Google not connected." };
      const { propertyId, dateRange = "30" } = input;
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - Number(dateRange));
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const analytics = google.analyticsdata({ version: "v1beta", auth: googleAuth });

      const [overviewRes, pagesRes, sourcesRes, countriesRes] = await Promise.all([
        analytics.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: startStr, endDate: endStr }],
            metrics: [
              { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" },
              { name: "screenPageViews" }, { name: "bounceRate" }, { name: "averageSessionDuration" },
            ],
          },
        }),
        analytics.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: startStr, endDate: endStr }],
            dimensions: [{ name: "pagePath" }],
            metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
            limit: 10,
          },
        }),
        analytics.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: startStr, endDate: endStr }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 8,
          },
        }),
        analytics.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: startStr, endDate: endStr }],
            dimensions: [{ name: "country" }],
            metrics: [{ name: "totalUsers" }],
            orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
            limit: 10,
          },
        }),
      ]);

      const ov = overviewRes.data.rows?.[0]?.metricValues || [];
      return {
        dateRange: `${startStr} to ${endStr}`,
        sessions: Number(ov[0]?.value || 0),
        users: Number(ov[1]?.value || 0),
        newUsers: Number(ov[2]?.value || 0),
        pageViews: Number(ov[3]?.value || 0),
        bounceRate: (Number(ov[4]?.value || 0) * 100).toFixed(1) + "%",
        avgSessionDuration: Number(ov[5]?.value || 0).toFixed(0) + "s",
        topPages: (pagesRes.data.rows || []).map((r) => ({
          page: r.dimensionValues[0].value,
          views: Number(r.metricValues[0].value),
          users: Number(r.metricValues[1].value),
        })),
        trafficSources: (sourcesRes.data.rows || []).map((r) => ({
          channel: r.dimensionValues[0].value,
          sessions: Number(r.metricValues[0].value),
        })),
        topCountries: (countriesRes.data.rows || []).map((r) => ({
          country: r.dimensionValues[0].value,
          users: Number(r.metricValues[0].value),
        })),
      };
    }

    case "get_search_console_data": {
      if (!googleAuth) return { error: "Google not connected." };
      const { siteUrl, dateRange = "30" } = input;
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - Number(dateRange));
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const sc = google.searchconsole({ version: "v1", auth: googleAuth });
      const [queryRes, pageRes] = await Promise.all([
        sc.searchanalytics.query({
          siteUrl,
          requestBody: { startDate: startStr, endDate: endStr, dimensions: ["query"], rowLimit: 15 },
        }),
        sc.searchanalytics.query({
          siteUrl,
          requestBody: { startDate: startStr, endDate: endStr, dimensions: ["page"], rowLimit: 10 },
        }),
      ]);

      return {
        dateRange: `${startStr} to ${endStr}`,
        topQueries: (queryRes.data.rows || []).map((r) => ({
          query: r.keys[0], clicks: r.clicks, impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(2) + "%", position: r.position.toFixed(1),
        })),
        topPages: (pageRes.data.rows || []).map((r) => ({
          page: r.keys[0], clicks: r.clicks, impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(2) + "%", position: r.position.toFixed(1),
        })),
      };
    }

    case "analyze_seo": {
      const analysis = await analyzeUrl(input.url);
      return {
        url: analysis.url, score: analysis.score,
        categoryScores: analysis.category_scores,
        title: analysis.title, metaDescription: analysis.meta_description,
        wordCount: analysis.word_count, h1s: analysis.h1s,
        totalImages: analysis.total_images, imagesWithAlt: analysis.images_with_alt,
        internalLinks: analysis.internal_links, externalLinks: analysis.external_links,
        keywords: analysis.keywords?.slice(0, 10),
        issues: analysis.checks?.filter((c) => c.status !== "pass").map((c) => ({
          name: c.name, status: c.status, message: c.message, category: c.category,
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { messages, skills = [] } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const { data: keyRow } = await supabase
      .from("ai_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", "anthropic")
      .maybeSingle();

    if (!keyRow) {
      return NextResponse.json(
        { error: "No Anthropic API key configured. Add one in Settings." },
        { status: 400 }
      );
    }

    const { conversationId } = await req.json().then(() => ({})).catch(() => ({}));

    const client = new Anthropic({ apiKey: keyRow.api_key });
    const origin = new URL(req.url).origin;
    const ctx = { supabase, user, origin };
    const modelId = "claude-sonnet-4-20250514";

    // Claude Sonnet 4 pricing (per 1M tokens)
    const INPUT_PRICE = 3.0;
    const OUTPUT_PRICE = 15.0;

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // Track tokens across all rounds
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Build system message with active skills
    let systemMsg = SYSTEM_MSG;
    if (skills.length > 0) {
      const skillPrompts = skills
        .map((id) => MARKETING_SKILLS.find((s) => s.id === id))
        .filter(Boolean)
        .map((s) => `\n\n---\n## Active Skill: ${s.name}\n${s.prompt}`)
        .join("");
      systemMsg += skillPrompts;
    }

    // Run with tool use loop (up to 5 rounds)
    let currentMessages = [...anthropicMessages];
    let finalContent = "";

    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: 4096,
        system: systemMsg,
        tools: TOOLS,
        messages: currentMessages,
      });

      // Track tokens
      totalInputTokens += response.usage?.input_tokens || 0;
      totalOutputTokens += response.usage?.output_tokens || 0;

      // If no tool use, extract text
      if (response.stop_reason !== "tool_use") {
        finalContent = response.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n");
        break;
      }

      // Process tool calls
      currentMessages.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          try {
            const result = await executeTool(block.name, block.input, ctx);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (err) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify({ error: err.message }),
              is_error: true,
            });
          }
        }
      }

      currentMessages.push({ role: "user", content: toolResults });

      if (i === 4) {
        finalContent = "I reached the maximum number of tool calls. Please try a more specific question.";
      }
    }

    // Calculate cost
    const totalTokens = totalInputTokens + totalOutputTokens;
    const costUsd = (totalInputTokens / 1_000_000) * INPUT_PRICE + (totalOutputTokens / 1_000_000) * OUTPUT_PRICE;

    // Generate title from first user message
    const title = messages[0]?.content?.slice(0, 100) || "Untitled";

    // Save conversation
    const allMessages = [
      ...messages,
      { role: "assistant", content: finalContent },
    ];

    await supabase.from("ai_conversations").insert({
      user_id: user.id,
      title,
      messages: allMessages,
      model: modelId,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
    });

    return NextResponse.json({
      content: finalContent,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        total_tokens: totalTokens,
        cost_usd: Number(costUsd.toFixed(6)),
      },
    });
  } catch (err) {
    logError("ai/chat", err);
    return NextResponse.json({ error: err.message || "Chat failed" }, { status: 500 });
  }
}

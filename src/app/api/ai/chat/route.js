import { generateText, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { createSEOTools } from "@/lib/ai-tools";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

function createModel(provider, apiKey) {
  if (provider === "openai") {
    const openai = createOpenAI({ apiKey });
    return openai("gpt-4o-mini");
  }
  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey });
    return anthropic("claude-sonnet-4-20250514");
  }
  if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey });
    return google("gemini-2.0-flash");
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

export async function POST(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { messages, provider = "openai" } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const { data: keyRow } = await supabase
      .from("ai_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (!keyRow) {
      return NextResponse.json(
        { error: `No ${provider} API key configured. Add one from the AI Content page.` },
        { status: 400 }
      );
    }

    const model = createModel(provider, keyRow.api_key);
    const origin = new URL(req.url).origin;
    const tools = createSEOTools({ supabase, user, origin });

    const result = await generateText({
      model,
      system: `You are an expert SEO assistant for an SEO tool dashboard. You have access to tools that can:
- Analyze any URL for SEO issues (analyzeSEO)
- Fetch Google Analytics data (getAnalyticsData, listGAProperties)
- Fetch Google Search Console data (getSearchConsoleData, listSearchConsoleSites)
- Fetch Google Reviews (getGoogleReviews)

When the user asks about their site's performance, SEO health, traffic, rankings, or reviews, use the appropriate tools to fetch real data and provide actionable insights.

Always be specific with recommendations. Reference actual data from the tools when available. Format responses with clear headings and bullet points for readability.

If a tool returns an error about missing API keys or connections, let the user know which page they need to visit to set it up.`,
      messages,
      tools,
      stopWhen: stepCountIs(5),
    });

    return NextResponse.json({ content: result.text });
  } catch (err) {
    logError("ai/chat", err);
    return NextResponse.json({ error: err.message || "Chat failed" }, { status: 500 });
  }
}

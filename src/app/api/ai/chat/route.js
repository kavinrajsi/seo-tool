import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { messages } = await req.json();

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

    const client = new Anthropic({ apiKey: keyRow.api_key });

    // Separate system message from conversation
    const systemMsg = "You are a helpful AI assistant. You are knowledgeable about SEO, web development, digital marketing, and business. Provide clear, actionable answers. Use markdown formatting for readability.";

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemMsg,
      messages: anthropicMessages,
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ content });
  } catch (err) {
    logError("ai/chat", err);
    return NextResponse.json({ error: err.message || "Chat failed" }, { status: 500 });
  }
}

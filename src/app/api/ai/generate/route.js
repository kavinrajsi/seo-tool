import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 30;

const TEMPLATES = {
  blog_post: (topic, keywords, tone) =>
    `Write a well-structured, SEO-optimized blog post about "${topic}". ${keywords ? `Include these keywords naturally: ${keywords}.` : ""} ${tone ? `Tone: ${tone}.` : "Tone: professional and engaging."} Include an engaging introduction, 3-5 subheadings with H2 tags, and a conclusion. Aim for 800-1200 words. Output in markdown format.`,

  meta_tags: (url, title, description) =>
    `Generate SEO-optimized meta tags for a webpage. ${url ? `URL: ${url}` : ""} ${title ? `Current title: "${title}"` : ""} ${description ? `Current description: "${description}"` : ""}

Generate:
1. An optimized title tag (30-60 characters, include primary keyword early)
2. A meta description (120-160 characters, include a call to action)
3. 5 relevant meta keywords
4. An og:title
5. An og:description
6. A twitter:title
7. A twitter:description

Output each as a labeled item.`,

  faq: (topic, count) =>
    `Generate ${count || 5} frequently asked questions and detailed answers about "${topic}". Format each as:

Q: [Question]
A: [Detailed answer in 2-3 sentences]

Make questions natural and conversational. Answers should be informative and include relevant keywords. These should be suitable for an FAQ schema markup.`,

  key_points: (content) =>
    `Extract and summarize the key points from the following content. Generate 5-8 concise, actionable bullet points that capture the main ideas. Each point should be 1-2 sentences.

Content:
${content}`,

  social_post: (topic, platform, tone) =>
    `Write a ${platform || "social media"} post about "${topic}". ${tone ? `Tone: ${tone}.` : "Tone: engaging and conversational."}

Requirements:
- ${platform === "twitter" ? "Keep under 280 characters" : "Keep under 500 characters"}
- Include 3-5 relevant hashtags
- Include a call to action
- Make it shareable and engaging

Generate 3 variations.`,

  email: (topic, type, tone) =>
    `Write a ${type || "marketing"} email about "${topic}". ${tone ? `Tone: ${tone}.` : "Tone: professional."}

Include:
- Subject line (compelling, under 60 characters)
- Preview text (under 90 characters)
- Email body with greeting, main content (2-3 paragraphs), and CTA
- Sign-off

Output in a clear format with labels.`,

  product_description: (product, features, tone) =>
    `Write an SEO-optimized product description for "${product}". ${features ? `Key features: ${features}.` : ""} ${tone ? `Tone: ${tone}.` : "Tone: persuasive and professional."}

Include:
- A compelling headline
- A short description (2-3 sentences)
- A detailed description (2-3 paragraphs)
- 5 key benefits as bullet points

Optimize for search engines while keeping it readable.`,

  rewrite: (content, tone) =>
    `Rewrite the following content to be more ${tone || "engaging and SEO-optimized"}. Maintain the original meaning but improve clarity, readability, and keyword optimization. Output in the same format as the input.

Content:
${content}`,
};

// Provider API calls
async function callOpenAI(apiKey, prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert SEO content writer. Generate high-quality, optimized content." },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        { role: "user", content: prompt },
      ],
      system: "You are an expert SEO content writer. Generate high-quality, optimized content.",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function callGoogle(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are an expert SEO content writer. Generate high-quality, optimized content.\n\n${prompt}` }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google API error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { provider, template, params } = await req.json();

    if (!provider || !template) {
      return NextResponse.json({ error: "provider and template are required" }, { status: 400 });
    }

    // Get API key
    const { data: keyRow } = await supabase
      .from("ai_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (!keyRow) {
      return NextResponse.json(
        { error: `No ${provider} API key configured. Add one in Settings.` },
        { status: 400 }
      );
    }

    // Build prompt from template
    const templateFn = TEMPLATES[template];
    if (!templateFn) {
      return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    }

    const prompt = templateFn(...(params || []));

    // Call provider
    let content;
    if (provider === "openai") {
      content = await callOpenAI(keyRow.api_key, prompt);
    } else if (provider === "anthropic") {
      content = await callAnthropic(keyRow.api_key, prompt);
    } else if (provider === "google") {
      content = await callGoogle(keyRow.api_key, prompt);
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    return NextResponse.json({ content, provider, template });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}

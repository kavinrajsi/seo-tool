import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let query = admin
    .from("content_briefs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: briefs, error } = await query;

  if (error) {
    // Handle table-not-found gracefully
    if (error.message && error.message.includes("does not exist")) {
      return NextResponse.json({ briefs: [] });
    }
    console.error("[Content Briefs API] Error:", error.message);
    return NextResponse.json({ briefs: [] });
  }

  return NextResponse.json({ briefs: briefs || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { topic, targetKeywords, contentType, targetAudience } = body;

  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const trimmedTopic = topic.trim();

  // Parse target keywords
  let keywords;
  if (targetKeywords && targetKeywords.trim()) {
    keywords = targetKeywords.split(",").map((k) => k.trim()).filter(Boolean);
  } else {
    // Derive keywords from topic
    const words = trimmedTopic.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    keywords = [trimmedTopic.toLowerCase()];
    if (words.length > 1) {
      keywords.push(...words.slice(0, 3));
    }
  }

  // Generate suggested headings based on topic
  const suggestedHeadings = [
    {
      level: "H2",
      text: `What is ${trimmedTopic}?`,
      children: [
        { level: "H3", text: `Definition of ${trimmedTopic}` },
        { level: "H3", text: `Key Concepts Behind ${trimmedTopic}` },
      ],
    },
    {
      level: "H2",
      text: `Why ${trimmedTopic} Matters`,
      children: [
        { level: "H3", text: `The Impact of ${trimmedTopic} on Your Business` },
        { level: "H3", text: `Key Benefits and Advantages` },
      ],
    },
    {
      level: "H2",
      text: `How to ${trimmedTopic}`,
      children: [
        { level: "H3", text: "Step-by-Step Implementation" },
        { level: "H3", text: "Requirements and Prerequisites" },
        { level: "H3", text: "Getting Started Guide" },
      ],
    },
    {
      level: "H2",
      text: `Best Practices for ${trimmedTopic}`,
      children: [
        { level: "H3", text: "Industry Standards and Guidelines" },
        { level: "H3", text: "Tips from Experts" },
      ],
    },
    {
      level: "H2",
      text: `Common Mistakes with ${trimmedTopic}`,
      children: [
        { level: "H3", text: "Pitfalls to Avoid" },
        { level: "H3", text: "How to Recover from Mistakes" },
      ],
    },
    {
      level: "H2",
      text: "Tools and Resources",
      children: [
        { level: "H3", text: "Recommended Tools" },
        { level: "H3", text: "Further Reading and Resources" },
      ],
    },
    {
      level: "H2",
      text: "FAQ",
      children: [
        { level: "H3", text: `Frequently Asked Questions About ${trimmedTopic}` },
      ],
    },
  ];

  // Determine recommended word count based on content type
  const type = contentType || "blog_post";
  const wordCountMap = {
    blog_post: "1,500 - 2,500 words",
    ultimate_guide: "3,000 - 5,000 words",
    listicle: "1,000 - 2,000 words",
    case_study: "2,000 - 3,000 words",
    how_to: "1,500 - 2,500 words",
    comparison: "2,000 - 3,000 words",
    other: "1,500 - 2,000 words",
  };
  const recommendedWordCount = wordCountMap[type] || "1,500 - 2,000 words";

  // Generate competitor analysis notes
  const primaryKeyword = keywords[0] || trimmedTopic.toLowerCase();
  const competitorNotes = [
    `Analyze top-ranking pages for '${primaryKeyword}' to identify content gaps and opportunities.`,
    `Check content gaps in existing articles covering ${trimmedTopic} and identify underserved subtopics.`,
    `Review featured snippets and People Also Ask results for queries related to '${primaryKeyword}'.`,
  ];

  // Generate questions to answer
  const questionsToAnswer = [
    `What is ${trimmedTopic}?`,
    `How does ${trimmedTopic} work?`,
    `What are the benefits of ${trimmedTopic}?`,
    `Who needs ${trimmedTopic}?`,
    `What are the best ${trimmedTopic} strategies?`,
    `How to measure ${trimmedTopic} success?`,
    `What are common ${trimmedTopic} mistakes?`,
  ];

  const briefData = {
    user_id: user.id,
    title: `Content Brief: ${trimmedTopic}`,
    topic: trimmedTopic,
    target_keywords: keywords,
    suggested_headings: suggestedHeadings,
    recommended_word_count: recommendedWordCount,
    competitor_notes: competitorNotes,
    questions_to_answer: questionsToAnswer,
    content_type: type,
    target_audience: targetAudience || "General audience",
    status: "draft",
  };

  const { data: brief, error } = await admin
    .from("content_briefs")
    .insert(briefData)
    .select()
    .single();

  if (error) {
    console.error("[Content Briefs API] Insert error:", error.message);
    if (error.message && error.message.includes("does not exist")) {
      return NextResponse.json(
        { error: "Content briefs table does not exist. Please create it in your database." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brief }, { status: 201 });
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const ANALYSIS_KEYS = [
  "title", "metaDescription", "h1", "headingHierarchy", "metaRobots",
  "sslHttps", "canonicalUrl", "mobileResponsiveness", "pageSpeed",
  "imageOptimization", "internalLinks", "externalLinks", "schemaMarkup",
  "openGraph", "twitterCards", "socialImageSize", "contentAnalysis",
  "urlStructure", "keywordsInUrl", "sitemapDetection",
  "accessibility", "hreflang", "favicon", "lazyLoading", "doctype",
  "characterEncoding", "googlePageSpeed", "aeo", "geo", "programmaticSeo",
  "aiSearchVisibility", "localSeo", "socialMediaMetaTags",
  "deprecatedHtmlTags", "googleAnalytics", "jsErrors", "consoleErrors",
  "htmlCompression", "htmlPageSize", "jsExecutionTime", "cdnUsage", "modernImageFormats",
];

function computeScore(results) {
  let total = 0;
  let count = 0;
  for (const key of ANALYSIS_KEYS) {
    const r = results[key];
    if (!r) continue;
    count++;
    if (r.score === "pass") total += 100;
    else if (r.score === "warning") total += 50;
  }
  return count > 0 ? Math.round(total / count) : 0;
}

function countSeverity(results, severity) {
  return ANALYSIS_KEYS.filter((k) => results[k]?.score === severity).length;
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await request.json();
  const { url, results, loadTimeMs, contentLength, teamId, leadEmail } = body;

  if (!url || !results) {
    return NextResponse.json({ error: "Missing url or results" }, { status: 400 });
  }

  const { data, error } = await admin.from("reports").insert({
    user_id: user?.id || null,
    team_id: teamId || null,
    lead_email: !user && leadEmail ? leadEmail.toLowerCase().trim() : null,
    url,
    overall_score: computeScore(results),
    fail_count: countSeverity(results, "fail"),
    warning_count: countSeverity(results, "warning"),
    pass_count: countSeverity(results, "pass"),
    results_json: results,
    load_time_ms: loadTimeMs || null,
    content_length: contentLength || null,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log usage
  await admin.from("usage_logs").insert({
    user_id: user?.id || null,
    url,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  let query = admin
    .from("reports")
    .select("id, url, overall_score, fail_count, warning_count, pass_count, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("url", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data, total: count, page, limit });
}

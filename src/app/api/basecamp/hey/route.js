import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

async function fetchAllPages(url, headers) {
  const items = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) break;
    const page = await res.json();
    items.push(...page);
    const linkHeader = res.headers.get("Link") || "";
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }
  return items;
}

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: config } = await supabase
      .from("basecamp_config")
      .select("account_id, access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!config) {
      return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });
    }

    const { account_id, access_token } = config;
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "SEO Tool (tool.madarth.com)",
    };

    const base = `https://3.basecampapi.com/${account_id}`;

    // Fetch all three "my" endpoints in parallel
    const [assignments, schedule, bookmarks] = await Promise.all([
      fetchAllPages(`${base}/my/assignments.json`, headers),
      fetchAllPages(`${base}/my/schedule.json`, headers),
      fetchAllPages(`${base}/my/bookmarks.json`, headers),
    ]);

    // Normalize into a unified list
    const items = [
      ...assignments.map((a) => ({
        id: a.id,
        type: "assignment",
        title: a.title || a.content || "Untitled",
        status: a.completed ? "completed" : "active",
        due_on: a.due_on || null,
        bucket: a.bucket?.name || "",
        bucket_id: a.bucket?.id || null,
        creator: a.creator?.name || "",
        assignees: a.assignees?.map((p) => p.name) || [],
        app_url: a.app_url || "",
        created_at: a.created_at || "",
        updated_at: a.updated_at || "",
      })),
      ...schedule.map((s) => ({
        id: s.id,
        type: "schedule",
        title: s.title || s.summary || "Untitled",
        status: "active",
        starts_at: s.starts_at || null,
        ends_at: s.ends_at || null,
        all_day: s.all_day || false,
        bucket: s.bucket?.name || "",
        bucket_id: s.bucket?.id || null,
        creator: s.creator?.name || "",
        participants: s.participants?.map((p) => p.name) || [],
        app_url: s.app_url || "",
        created_at: s.created_at || "",
        updated_at: s.updated_at || "",
      })),
      ...bookmarks.map((b) => ({
        id: b.id,
        type: "bookmark",
        title: b.title || b.content || "Untitled",
        status: "active",
        recording_type: b.type || "",
        bucket: b.bucket?.name || "",
        bucket_id: b.bucket?.id || null,
        creator: b.creator?.name || "",
        app_url: b.app_url || "",
        created_at: b.created_at || "",
        updated_at: b.updated_at || "",
      })),
    ];

    // Sort by most recently updated
    items.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    return NextResponse.json({
      items,
      counts: {
        assignments: assignments.length,
        schedule: schedule.length,
        bookmarks: bookmarks.length,
      },
    });
  } catch (err) {
    logError("basecamp/hey", err);
    return NextResponse.json({ error: err.message || "Failed to fetch Hey! data" }, { status: 500 });
  }
}

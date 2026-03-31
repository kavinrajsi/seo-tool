import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

const MAX_READS = 200; // fetch up to 200 read items (4 pages × 50)

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

    // Fetch page 1 — unreads and memories come only from page 1
    const res1 = await fetch(
      `https://3.basecampapi.com/${account_id}/my/readings.json?page=1`,
      { headers }
    );

    if (!res1.ok) {
      return NextResponse.json({ error: "Failed to fetch readings" }, { status: res1.status });
    }

    const page1 = await res1.json();
    const allReads = [...(page1.reads || [])];

    // Paginate reads up to MAX_READS
    let linkHeader = res1.headers.get("Link") || "";
    let nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    let nextUrl = nextMatch ? nextMatch[1] : null;

    while (nextUrl && allReads.length < MAX_READS) {
      const res = await fetch(nextUrl, { headers });
      if (!res.ok) break;
      const page = await res.json();
      allReads.push(...(page.reads || []));
      linkHeader = res.headers.get("Link") || "";
      nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = nextMatch ? nextMatch[1] : null;
    }

    const normalize = (item) => ({
      ...item,
      bucket_name: item.bucket?.name || item.bucket_name || null,
    });

    const unreads = (page1.unreads || []).map(normalize);
    const reads = allReads.slice(0, MAX_READS).map(normalize);
    const memories = (page1.memories || []).map(normalize);

    return NextResponse.json({
      unreads,
      reads,
      memories,
      total: {
        unreads: unreads.length,
        reads: reads.length,
        memories: memories.length,
      },
    });
  } catch (err) {
    logError("basecamp/readings", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

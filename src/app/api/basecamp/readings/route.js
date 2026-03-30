import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";

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

    const res = await fetch(
      `https://3.basecampapi.com/${account_id}/my/readings.json?page=${page}`,
      { headers }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch readings" }, { status: res.status });
    }

    const data = await res.json();

    // Parse Link header for pagination
    const linkHeader = res.headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    const hasNextPage = !!nextMatch;

    return NextResponse.json({
      unreads: data.unreads || [],
      reads: data.reads || [],
      memories: data.memories || [],
      hasNextPage,
    });
  } catch (err) {
    logError("basecamp/readings", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

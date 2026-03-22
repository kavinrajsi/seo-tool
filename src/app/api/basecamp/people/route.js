import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

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

    // Fetch all people (with pagination)
    const people = [];
    let nextUrl = `https://3.basecampapi.com/${account_id}/people.json`;

    while (nextUrl) {
      const res = await fetch(nextUrl, { headers });
      if (!res.ok) break;
      const page = await res.json();
      people.push(...page);
      const linkHeader = res.headers.get("Link") || "";
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = match ? match[1] : null;
    }

    return NextResponse.json({ people });
  } catch (err) {
    logError("basecamp/people", err);
    return NextResponse.json({ error: err.message || "Failed to fetch people" }, { status: 500 });
  }
}

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
    const sync = searchParams.get("sync");

    // If not syncing, return stored data
    if (!sync) {
      const { data: stored } = await supabase
        .from("basecamp_people")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      return NextResponse.json({ people: stored || [], source: "db" });
    }

    // Sync from Basecamp API
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

    // Upsert into DB
    const now = new Date().toISOString();
    const rows = people.map((p) => ({
      user_id: user.id,
      basecamp_id: p.id,
      name: p.name || "",
      email: p.email_address || "",
      avatar_url: p.avatar_url || "",
      title: p.title || "",
      admin: p.admin || false,
      owner: p.owner || false,
      personable_type: p.personable_type || "",
      company_name: p.company?.name || "",
      app_url: p.app_url || "",
      created_at_basecamp: p.created_at || null,
      updated_at_basecamp: p.updated_at || null,
      synced_at: now,
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      await supabase.from("basecamp_people").upsert(chunk, { onConflict: "user_id,basecamp_id" });
    }

    // Return stored data
    const { data: stored } = await supabase
      .from("basecamp_people")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    return NextResponse.json({ people: stored || [], source: "api", synced: people.length });
  } catch (err) {
    logError("basecamp/people", err);
    return NextResponse.json({ error: err.message || "Failed to fetch people" }, { status: 500 });
  }
}

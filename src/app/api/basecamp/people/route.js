import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getDb } from "@/lib/neon";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

const STALE_HOURS = 24;

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { searchParams } = new URL(req.url);
    const sync = searchParams.get("sync");
    const countOnly = searchParams.get("count");

    const sql = getDb();

    // Count only (for settings page)
    if (countOnly) {
      const result = await sql`
        SELECT COUNT(*)::int as count FROM basecamp_people WHERE user_id = ${user.id}
      `;
      return NextResponse.json({ count: result[0]?.count ?? 0 });
    }

    // Check freshness of cached data
    const freshness = await sql`
      SELECT MAX(synced_at) as last_synced, COUNT(*)::int as total
      FROM basecamp_people WHERE user_id = ${user.id}
    `;
    const lastSynced = freshness[0]?.last_synced;
    const total = freshness[0]?.total ?? 0;
    const isStale = !lastSynced || (Date.now() - new Date(lastSynced).getTime()) > STALE_HOURS * 60 * 60 * 1000;

    // If not syncing and data exists and is fresh, return stored data
    if (!sync && total > 0 && !isStale) {
      const data = await sql`
        SELECT * FROM basecamp_people WHERE user_id = ${user.id} ORDER BY name ASC
      `;
      return NextResponse.json({ people: data ?? [], source: "db", last_synced: lastSynced, stale: false });
    }

    // If not syncing but data is stale, return cached + stale flag so frontend can background-sync
    if (!sync && total > 0 && isStale) {
      const data = await sql`
        SELECT * FROM basecamp_people WHERE user_id = ${user.id} ORDER BY name ASC
      `;
      return NextResponse.json({ people: data ?? [], source: "db", last_synced: lastSynced, stale: true });
    }

    // No data or explicit sync requested — fetch from Basecamp API
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

    // Upsert into Neon
    const now = new Date().toISOString();
    for (const p of people) {
      await sql`
        INSERT INTO basecamp_people (user_id, basecamp_id, name, email, avatar_url, title, admin, owner, personable_type, company_name, app_url, created_at_basecamp, updated_at_basecamp, synced_at)
        VALUES (${user.id}, ${p.id}, ${p.name || ""}, ${p.email_address || ""}, ${p.avatar_url || ""}, ${p.title || ""}, ${p.admin || false}, ${p.owner || false}, ${p.personable_type || ""}, ${p.company?.name || ""}, ${p.app_url || ""}, ${p.created_at || null}, ${p.updated_at || null}, ${now})
        ON CONFLICT (user_id, basecamp_id) DO UPDATE SET
          name = EXCLUDED.name, email = EXCLUDED.email, avatar_url = EXCLUDED.avatar_url,
          title = EXCLUDED.title, admin = EXCLUDED.admin, owner = EXCLUDED.owner,
          personable_type = EXCLUDED.personable_type, company_name = EXCLUDED.company_name,
          app_url = EXCLUDED.app_url, created_at_basecamp = EXCLUDED.created_at_basecamp,
          updated_at_basecamp = EXCLUDED.updated_at_basecamp, synced_at = EXCLUDED.synced_at
      `;
    }

    const stored = await sql`
      SELECT * FROM basecamp_people WHERE user_id = ${user.id} ORDER BY name ASC
    `;

    return NextResponse.json({ people: stored ?? [], source: "api", synced: people.length, last_synced: now, stale: false });
  } catch (err) {
    logError("basecamp/people", err);
    return NextResponse.json({ error: err.message || "Failed to fetch people" }, { status: 500 });
  }
}

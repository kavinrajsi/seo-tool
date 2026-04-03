import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getDb } from "@/lib/neon";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user } = auth;
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 500);
  const columns = searchParams.get("columns"); // optional: comma-separated column names

  const sql = getDb();

  let data;
  if (filter === "todos") {
    data = await sql`
      SELECT * FROM basecamp_events
      WHERE user_id = ${user.id} AND event_kind LIKE '%todo%'
      ORDER BY received_at DESC LIMIT ${limit}
    `;
  } else if (filter === "messages") {
    data = await sql`
      SELECT * FROM basecamp_events
      WHERE user_id = ${user.id} AND (event_kind LIKE '%message%' OR event_kind LIKE '%comment%')
      ORDER BY received_at DESC LIMIT ${limit}
    `;
  } else if (filter === "documents") {
    data = await sql`
      SELECT * FROM basecamp_events
      WHERE user_id = ${user.id} AND (event_kind LIKE '%document%' OR event_kind LIKE '%upload%')
      ORDER BY received_at DESC LIMIT ${limit}
    `;
  } else if (filter === "notifications") {
    data = await sql`
      SELECT id, event_kind, recording_title, recording_id, project_name, creator_name, app_url, received_at
      FROM basecamp_events
      WHERE user_id = ${user.id}
      ORDER BY received_at DESC LIMIT ${limit}
    `;
  } else {
    data = await sql`
      SELECT * FROM basecamp_events
      WHERE user_id = ${user.id}
      ORDER BY received_at DESC LIMIT ${limit}
    `;
  }

  return NextResponse.json({ events: data ?? [] });
}

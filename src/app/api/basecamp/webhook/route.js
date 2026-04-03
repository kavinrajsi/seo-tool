import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "@/lib/neon";
import { logError } from "@/lib/logger";

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
  try {
    const payload = await req.json();

    if (!payload || !payload.kind) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const recording = payload.recording || {};
    const creator = payload.creator || {};
    const bucket = recording.bucket || {};

    const accountId = recording.url?.match(/basecampapi\.com\/(\d+)/)?.[1] || "";

    const userIds = [];
    if (accountId) {
      const { data: configs } = await supabase
        .from("basecamp_config")
        .select("user_id")
        .eq("account_id", accountId);
      if (configs) {
        for (const c of configs) userIds.push(c.user_id);
      }
    }

    const sql = getDb();
    const uids = userIds.length > 0 ? userIds : [null];

    for (const uid of uids) {
      await sql`
        INSERT INTO basecamp_events (user_id, account_id, event_kind, recording_type, recording_id, recording_title, recording_status, project_id, project_name, creator_name, creator_email, app_url, raw_payload)
        VALUES (${uid}, ${accountId}, ${payload.kind}, ${recording.type || null}, ${recording.id || null}, ${recording.title || null}, ${recording.status || null}, ${bucket.id || null}, ${bucket.name || null}, ${creator.name || null}, ${creator.email_address || null}, ${recording.app_url || null}, ${JSON.stringify(payload)})
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("basecamp/webhook", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

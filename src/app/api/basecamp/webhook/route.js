import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function POST(req) {
  try {
    const payload = await req.json();

    if (!payload || !payload.kind) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const recording = payload.recording || {};
    const creator = payload.creator || {};
    const bucket = recording.bucket || {};

    // Extract account_id from the recording URL
    // URL format: https://3.basecampapi.com/{account_id}/...
    const accountId = recording.url?.match(/basecampapi\.com\/(\d+)/)?.[1] || "";

    // Find all users who have this account connected
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

    // Save event for each user (or once with null user_id if no match)
    const rows = (userIds.length > 0 ? userIds : [null]).map((uid) => ({
      user_id: uid,
      account_id: accountId,
      event_kind: payload.kind,
      recording_type: recording.type || null,
      recording_id: recording.id || null,
      recording_title: recording.title || null,
      recording_status: recording.status || null,
      project_id: bucket.id || null,
      project_name: bucket.name || null,
      creator_name: creator.name || null,
      creator_email: creator.email_address || null,
      app_url: recording.app_url || null,
      raw_payload: payload,
    }));

    await supabase.from("basecamp_events").insert(rows);

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("basecamp/webhook", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

    // Find which user owns this account
    let userId = null;
    if (accountId) {
      const { data: config } = await supabase
        .from("basecamp_config")
        .select("user_id")
        .eq("account_id", accountId)
        .single();
      userId = config?.user_id || null;
    }

    await supabase.from("basecamp_events").insert({
      user_id: userId,
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
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("basecamp/webhook", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

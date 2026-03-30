import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

async function getConfig(supabase, userId) {
  const { data: config } = await supabase
    .from("basecamp_config")
    .select("account_id, access_token")
    .eq("user_id", userId)
    .maybeSingle();
  return config;
}

// GET /api/basecamp/subscriptions?recording_id=<id>
// Returns subscription info + subscribers list for a recording
export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { searchParams } = new URL(req.url);
    const recordingId = searchParams.get("recording_id");
    if (!recordingId) return NextResponse.json({ error: "recording_id is required" }, { status: 400 });

    const config = await getConfig(supabase, user.id);
    if (!config) return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });

    const { account_id, access_token } = config;
    const res = await fetch(
      `https://3.basecampapi.com/${account_id}/recordings/${recordingId}/subscription.json`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "SEO Tool (tool.madarth.com)",
        },
      }
    );

    if (!res.ok) return NextResponse.json({ error: "Failed to fetch subscription" }, { status: res.status });

    const subscription = await res.json();
    return NextResponse.json({ subscription });
  } catch (err) {
    logError("basecamp/subscriptions GET", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// POST /api/basecamp/subscriptions?recording_id=<id>
// Subscribe the authenticated user to the recording
export async function POST(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { searchParams } = new URL(req.url);
    const recordingId = searchParams.get("recording_id");
    if (!recordingId) return NextResponse.json({ error: "recording_id is required" }, { status: 400 });

    const config = await getConfig(supabase, user.id);
    if (!config) return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });

    const { account_id, access_token } = config;
    const res = await fetch(
      `https://3.basecampapi.com/${account_id}/recordings/${recordingId}/subscription.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "SEO Tool (tool.madarth.com)",
        },
      }
    );

    if (!res.ok) return NextResponse.json({ error: "Failed to subscribe" }, { status: res.status });

    const subscription = await res.json();
    return NextResponse.json({ subscription });
  } catch (err) {
    logError("basecamp/subscriptions POST", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// DELETE /api/basecamp/subscriptions?recording_id=<id>
// Unsubscribe the authenticated user from the recording
export async function DELETE(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { searchParams } = new URL(req.url);
    const recordingId = searchParams.get("recording_id");
    if (!recordingId) return NextResponse.json({ error: "recording_id is required" }, { status: 400 });

    const config = await getConfig(supabase, user.id);
    if (!config) return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });

    const { account_id, access_token } = config;
    const res = await fetch(
      `https://3.basecampapi.com/${account_id}/recordings/${recordingId}/subscription.json`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "SEO Tool (tool.madarth.com)",
        },
      }
    );

    // 204 = success (always succeeds even if not previously subscribed)
    if (res.status === 204 || res.ok) return NextResponse.json({ success: true });

    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: res.status });
  } catch (err) {
    logError("basecamp/subscriptions DELETE", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// PUT /api/basecamp/subscriptions?recording_id=<id>
// Bulk add/remove subscribers
// Body: { subscriptions: [personId, ...], unsubscriptions: [personId, ...] }
export async function PUT(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { searchParams } = new URL(req.url);
    const recordingId = searchParams.get("recording_id");
    if (!recordingId) return NextResponse.json({ error: "recording_id is required" }, { status: 400 });

    const body = await req.json();
    const { subscriptions = [], unsubscriptions = [] } = body;

    const config = await getConfig(supabase, user.id);
    if (!config) return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });

    const { account_id, access_token } = config;
    const res = await fetch(
      `https://3.basecampapi.com/${account_id}/recordings/${recordingId}/subscription.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          "User-Agent": "SEO Tool (tool.madarth.com)",
        },
        body: JSON.stringify({ subscriptions, unsubscriptions }),
      }
    );

    if (!res.ok) return NextResponse.json({ error: "Failed to update subscribers" }, { status: res.status });

    const subscription = await res.json();
    return NextResponse.json({ subscription });
  } catch (err) {
    logError("basecamp/subscriptions PUT", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

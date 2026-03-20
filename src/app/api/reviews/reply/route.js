import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getAuthenticatedClient } from "@/lib/google";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const authResult = await getUserFromRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, supabase } = authResult;

    const { locationId, reviewId, comment } = await req.json();

    if (!locationId || !reviewId || !comment) {
      return NextResponse.json({ error: "Location ID, review ID, and comment are required" }, { status: 400 });
    }

    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Not connected to Google" }, { status: 403 });
    }

    const origin = new URL(req.url).origin;
    const auth = getAuthenticatedClient(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: tokenRow.expiry_date,
      },
      `${origin}/api/google/callback`
    );

    // Reply to review via Google My Business API
    const replyUrl = `https://mybusiness.googleapis.com/v4/${locationId}/reviews/${reviewId}/reply`;
    const replyRes = await auth.request({
      url: replyUrl,
      method: "PUT",
      data: { comment },
    });

    return NextResponse.json({
      success: true,
      reply: replyRes.data,
    });
  } catch (err) {
    console.error("Reply to review error:", err);
    return NextResponse.json({ error: err.message || "Failed to reply" }, { status: 500 });
  }
}

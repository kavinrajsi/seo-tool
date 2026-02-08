import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../../_lib/refreshToken";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reviewId, googleReviewId, replyText } = body;

  if (!googleReviewId || !replyText) {
    return NextResponse.json({ error: "Google review ID and reply text are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("gbp_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!connection || !connection.location_id) {
    return NextResponse.json({ error: "Google Business Profile not connected or no location selected" }, { status: 404 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
  }

  // Push reply to Google
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${connection.location_id}/reviews/${googleReviewId}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: replyText }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error("[GBP Reply] Error:", errData);
    return NextResponse.json({ error: "Failed to post reply to Google" }, { status: 502 });
  }

  // Update local review record if reviewId is provided
  if (reviewId) {
    await admin
      .from("product_reviews")
      .update({
        response_text: replyText,
        status: "responded",
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}

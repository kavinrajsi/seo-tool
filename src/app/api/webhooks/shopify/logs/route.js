import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Get webhook logs
 *
 * GET /api/webhooks/shopify/logs
 * Query params:
 *   - limit (default: 50)
 *   - status (filter by status: success, error, rejected)
 *   - topic (filter by topic: products/create, products/update, etc.)
 */
export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user is admin (optional - remove if you want all users to see logs)
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const status = searchParams.get("status");
  const topic = searchParams.get("topic");

  // Build query
  let query = admin
    .from("webhook_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (status) {
    query = query.eq("status", status);
  }

  if (topic) {
    query = query.eq("topic", topic);
  }

  const { data: logs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get summary stats
  const { data: stats } = await admin.rpc("get_webhook_stats").single();

  // If RPC doesn't exist, calculate manually
  let summary = stats;
  if (!stats) {
    const { count: total } = await admin
      .from("webhook_logs")
      .select("*", { count: "exact", head: true });

    const { count: success } = await admin
      .from("webhook_logs")
      .select("*", { count: "exact", head: true })
      .eq("status", "success");

    const { count: errors } = await admin
      .from("webhook_logs")
      .select("*", { count: "exact", head: true })
      .eq("status", "error");

    const { count: today } = await admin
      .from("webhook_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date().toISOString().split("T")[0]);

    summary = {
      total: total || 0,
      success: success || 0,
      errors: errors || 0,
      today: today || 0,
    };
  }

  return NextResponse.json({
    logs: logs || [],
    summary,
  });
}

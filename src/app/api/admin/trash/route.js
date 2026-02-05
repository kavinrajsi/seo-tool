import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: reports, error } = await admin
    .from("reports")
    .select("id, url, overall_score, fail_count, warning_count, pass_count, created_at, deleted_at, user_id")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch user emails for each report
  const userIds = [...new Set((reports || []).map((r) => r.user_id).filter(Boolean))];
  let profileMap = {};

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profiles) {
      profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.email]));
    }
  }

  const enriched = (reports || []).map((r) => ({
    ...r,
    user_email: profileMap[r.user_id] || null,
  }));

  return NextResponse.json({ reports: enriched });
}

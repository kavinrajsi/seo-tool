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

  // Fetch all profiles
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count reports and scans for each user
  const users = await Promise.all(
    profiles.map(async (p) => {
      const { count: reportCount } = await admin
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", p.id);

      const { count: scanCount } = await admin
        .from("usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", p.id);

      return {
        ...p,
        reportCount: reportCount || 0,
        scanCount: scanCount || 0,
      };
    })
  );

  return NextResponse.json({ users });
}

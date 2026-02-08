import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify the current user is a member of this team
  const { data: membership } = await admin
    .from("team_members")
    .select("id")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all members with profile info
  const { data: members, error } = await admin
    .from("team_members")
    .select("id, user_id, role, created_at")
    .eq("team_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch profiles for all member user_ids
  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  const profileMap = {};
  for (const p of profiles || []) {
    profileMap[p.id] = p;
  }

  const enriched = members.map((m) => ({
    ...m,
    name: profileMap[m.user_id]?.name || null,
    email: profileMap[m.user_id]?.email || null,
  }));

  return NextResponse.json({ members: enriched });
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
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

  const { id } = await params;
  const body = await request.json();
  const { role } = body;

  // Validate role value
  if (!role || !["user", "admin", "hr"].includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be 'user', 'admin', or 'hr'." }, { status: 400 });
  }

  // Prevent self-demotion
  if (id === user.id) {
    return NextResponse.json({ error: "Cannot change your own role." }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", status: 401 };

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Forbidden", status: 403 };

  return { user, admin };
}

export async function GET(request, { params }) {
  const result = await verifyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { admin } = result;
  const { id } = await params;

  const { data: reports, error } = await admin
    .from("reports")
    .select("id, url, overall_score, fail_count, warning_count, pass_count, created_at")
    .eq("user_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: reports || [] });
}

export async function DELETE(request, { params }) {
  const result = await verifyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { user, admin } = result;
  const { id } = await params;

  // Prevent self-deletion
  if (id === user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // Delete user from Supabase Auth (cascades to profiles and related data)
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

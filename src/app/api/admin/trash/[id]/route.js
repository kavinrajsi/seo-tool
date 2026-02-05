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

  return { admin };
}

export async function PATCH(request, { params }) {
  const result = await verifyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id } = await params;

  const { error } = await result.admin
    .from("reports")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const result = await verifyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id } = await params;

  const { error } = await result.admin
    .from("reports")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

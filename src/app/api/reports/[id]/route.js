import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const admin = createAdminClient();
  const { id } = await params;

  const { data, error } = await admin
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const admin = createAdminClient();
  const { id } = await params;

  const { error } = await admin
    .from("reports")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

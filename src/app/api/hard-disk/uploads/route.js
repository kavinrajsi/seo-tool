import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getDb } from "@/lib/neon";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();

  const data = await sql`
    SELECT id, name, file_name, line_count, uploaded_by, created_at
    FROM hard_disk_uploads ORDER BY created_at DESC
  `;

  return NextResponse.json({ uploads: data ?? [] });
}

export async function DELETE(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user, supabase } = auth;

  const { data: me } = await supabase
    .from("employees")
    .select("role")
    .eq("work_email", user.email)
    .maybeSingle();

  if (!me || (me.role !== "admin" && me.role !== "owner")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sql = getDb();
  await sql`DELETE FROM hard_disk_uploads WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getDb } from "@/lib/neon";

export const maxDuration = 60;

export async function POST(req) {
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

  const { name, file_name, lines, uploadId, finalize } = await req.json();
  const sql = getDb();

  let id = uploadId;

  // First chunk — create the upload record
  if (!id) {
    if (!name || !file_name) {
      return NextResponse.json({ error: "name and file_name required for first chunk" }, { status: 400 });
    }
    const result = await sql`
      INSERT INTO hard_disk_uploads (name, file_name, line_count, uploaded_by)
      VALUES (${name}, ${file_name}, 0, ${user.email})
      RETURNING id
    `;
    id = result[0].id;
  }

  // Insert lines for this chunk
  if (lines?.length > 0) {
    try {
      const placeholders = [];
      const params = [];
      let idx = 1;
      for (const path of lines) {
        placeholders.push(`($${idx++}, $${idx++})`);
        params.push(id, path);
      }
      await sql.query(
        `INSERT INTO hard_disk_files (upload_id, path) VALUES ${placeholders.join(",")}`,
        params
      );
    } catch (error) {
      await sql`DELETE FROM hard_disk_uploads WHERE id = ${id}`;
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Last chunk — count actual rows and update line_count
  if (finalize) {
    const countResult = await sql`
      SELECT COUNT(*)::int as count FROM hard_disk_files WHERE upload_id = ${id}
    `;
    const count = countResult[0]?.count ?? 0;
    await sql`UPDATE hard_disk_uploads SET line_count = ${count} WHERE id = ${id}`;
    return NextResponse.json({ uploadId: id, line_count: count });
  }

  return NextResponse.json({ uploadId: id });
}

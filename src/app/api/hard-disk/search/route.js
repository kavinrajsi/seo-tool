import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getDb } from "@/lib/neon";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);

  if (!q) return NextResponse.json({ results: [], total: 0 });

  const sql = getDb();
  const pattern = `%${q}%`;

  const data = await sql`
    SELECT f.id, f.path, f.upload_id, u.name as upload_name
    FROM hard_disk_files f
    LEFT JOIN hard_disk_uploads u ON u.id = f.upload_id
    WHERE f.path ILIKE ${pattern}
    LIMIT ${limit}
  `;

  const countResult = await sql`
    SELECT COUNT(*)::int as total FROM hard_disk_files WHERE path ILIKE ${pattern}
  `;

  const results = data.map((r) => ({
    id: r.id,
    path: r.path,
    upload_id: r.upload_id,
    hard_disk_uploads: r.upload_name ? { name: r.upload_name } : null,
  }));

  return NextResponse.json({ results, total: countResult[0]?.total ?? 0 });
}

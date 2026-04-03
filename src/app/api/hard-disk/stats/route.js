import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getDb } from "@/lib/neon";
import { getFileType } from "@/lib/hard-disk-types";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();

  // Uploads list
  const uploads = await sql`
    SELECT id, name, line_count, created_at FROM hard_disk_uploads
    ORDER BY created_at DESC
  `;

  const total = uploads.reduce((sum, u) => sum + (u.line_count ?? 0), 0);

  // Sample paths to estimate type breakdown
  const sample = await sql`SELECT path FROM hard_disk_files LIMIT 3000`;

  const by_type = { document: 0, image: 0, video: 0, audio: 0, archive: 0, font: 0, folder: 0, other: 0 };
  for (const { path } of sample) {
    const t = getFileType(path);
    by_type[t] = (by_type[t] ?? 0) + 1;
  }

  // Recent 3 entries
  const recent = await sql`
    SELECT f.id, f.path, u.name as upload_name
    FROM hard_disk_files f
    LEFT JOIN hard_disk_uploads u ON u.id = f.upload_id
    ORDER BY f.id DESC LIMIT 3
  `;

  const recentFormatted = recent.map((r) => ({
    id: r.id,
    path: r.path,
    hard_disk_uploads: r.upload_name ? { name: r.upload_name } : null,
  }));

  return NextResponse.json({ total, by_type, recent: recentFormatted, uploads });
}

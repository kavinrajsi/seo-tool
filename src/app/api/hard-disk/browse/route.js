import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getDb } from "@/lib/neon";
import { TYPE_EXTS } from "@/lib/hard-disk-types";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "50"));
  const type  = searchParams.get("type")  ?? "all";
  const drive = searchParams.get("drive") ?? "";
  const q     = searchParams.get("q")?.trim() ?? "";

  const offset = (page - 1) * limit;
  const sql = getDb();

  // Build WHERE conditions
  const conditions = [];
  const params = [];
  let idx = 1;

  if (q) {
    conditions.push(`f.path ILIKE $${idx++}`);
    params.push(`%${q}%`);
  }
  if (drive) {
    conditions.push(`f.upload_id = $${idx++}`);
    params.push(drive);
  }
  if (type !== "all" && TYPE_EXTS[type]) {
    const exts = TYPE_EXTS[type].map((ext) => {
      params.push(`%.${ext}`);
      return `f.path ILIKE $${idx++}`;
    });
    conditions.push(`(${exts.join(" OR ")})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(limit, offset);
  const limitIdx = idx++;
  const offsetIdx = idx++;

  const data = await sql.query(
    `SELECT f.id, f.path, f.upload_id, u.id as u_id, u.name as u_name, u.created_at as u_created_at
     FROM hard_disk_files f
     LEFT JOIN hard_disk_uploads u ON u.id = f.upload_id
     ${where}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  const countResult = await sql.query(
    `SELECT COUNT(*)::int as total FROM hard_disk_files f ${where}`,
    params.slice(0, -2)
  );

  const files = data.map((r) => ({
    id: r.id,
    path: r.path,
    upload_id: r.upload_id,
    hard_disk_uploads: r.u_id ? { id: r.u_id, name: r.u_name, created_at: r.u_created_at } : null,
  }));

  return NextResponse.json({ files, total: countResult[0]?.total ?? 0, page, limit });
}

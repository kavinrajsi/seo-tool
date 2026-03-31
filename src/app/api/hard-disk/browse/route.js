import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { TYPE_EXTS } from "@/lib/hard-disk-types";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = auth;
  const { searchParams } = new URL(req.url);

  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "50"));
  const type  = searchParams.get("type")  ?? "all";
  const drive = searchParams.get("drive") ?? "";
  const q     = searchParams.get("q")?.trim() ?? "";

  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = supabase
    .from("hard_disk_files")
    .select("id, path, upload_id, hard_disk_uploads(id, name, created_at)", { count: "estimated" })
    .range(from, to);

  if (q)     query = query.ilike("path", `%${q}%`);
  if (drive) query = query.eq("upload_id", drive);

  if (type !== "all" && TYPE_EXTS[type]) {
    const orFilter = TYPE_EXTS[type].map((ext) => `path.ilike.%.${ext}`).join(",");
    query = query.or(orFilter);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ files: data ?? [], total: count ?? 0, page, limit });
}

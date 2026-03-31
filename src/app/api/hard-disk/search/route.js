import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = auth;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);

  if (!q) return NextResponse.json({ results: [], total: 0 });

  const { data, error, count } = await supabase
    .from("hard_disk_files")
    .select("id, path, upload_id, hard_disk_uploads(name)", { count: "estimated" })
    .ilike("path", `%${q}%`)
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ results: data ?? [], total: count ?? 0 });
}

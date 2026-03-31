import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getFileType } from "@/lib/hard-disk-types";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = auth;

  // Uploads list (for drives dropdown + total)
  const { data: uploads } = await supabase
    .from("hard_disk_uploads")
    .select("id, name, line_count, created_at")
    .order("created_at", { ascending: false });

  const total = uploads?.reduce((sum, u) => sum + (u.line_count ?? 0), 0) ?? 0;

  // Sample paths to estimate type breakdown
  const { data: sample } = await supabase
    .from("hard_disk_files")
    .select("path")
    .limit(3000);

  const by_type = { document: 0, image: 0, video: 0, audio: 0, archive: 0, font: 0, folder: 0, other: 0 };
  for (const { path } of sample ?? []) {
    const t = getFileType(path);
    by_type[t] = (by_type[t] ?? 0) + 1;
  }

  // Recent 3 entries
  const { data: recent } = await supabase
    .from("hard_disk_files")
    .select("id, path, hard_disk_uploads(name)")
    .order("id", { ascending: false })
    .limit(3);

  return NextResponse.json({ total, by_type, recent: recent ?? [], uploads: uploads ?? [] });
}

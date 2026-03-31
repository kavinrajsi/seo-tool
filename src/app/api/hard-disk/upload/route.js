import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

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

  let id = uploadId;

  // First chunk — create the upload record
  if (!id) {
    if (!name || !file_name) {
      return NextResponse.json({ error: "name and file_name required for first chunk" }, { status: 400 });
    }
    const { data: upload, error: ue } = await supabase
      .from("hard_disk_uploads")
      .insert({ name, file_name, line_count: 0, uploaded_by: user.email })
      .select("id")
      .single();
    if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });
    id = upload.id;
  }

  // Insert lines for this chunk
  if (lines?.length > 0) {
    const rows = lines.map((path) => ({ upload_id: id, path }));
    const { error } = await supabase.from("hard_disk_files").insert(rows);
    if (error) {
      await supabase.from("hard_disk_uploads").delete().eq("id", id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Last chunk — count actual rows and update line_count
  if (finalize) {
    const { count } = await supabase
      .from("hard_disk_files")
      .select("id", { count: "exact", head: true })
      .eq("upload_id", id);
    await supabase.from("hard_disk_uploads").update({ line_count: count ?? 0 }).eq("id", id);
    return NextResponse.json({ uploadId: id, line_count: count ?? 0 });
  }

  return NextResponse.json({ uploadId: id });
}

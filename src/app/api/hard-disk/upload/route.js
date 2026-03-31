import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export const maxDuration = 60;

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user, supabase } = auth;

  // Only admin or owner can upload
  const { data: me } = await supabase
    .from("employees")
    .select("role")
    .eq("work_email", user.email)
    .maybeSingle();

  if (!me || (me.role !== "admin" && me.role !== "owner")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const name = formData.get("name")?.trim();

  if (!file || !name) {
    return NextResponse.json({ error: "file and name are required" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  // Create upload record
  const { data: upload, error: uploadError } = await supabase
    .from("hard_disk_uploads")
    .insert({ name, file_name: file.name, line_count: lines.length, uploaded_by: user.email })
    .select("id")
    .single();

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Batch insert paths in chunks of 1000
  const CHUNK = 1000;
  for (let i = 0; i < lines.length; i += CHUNK) {
    const rows = lines.slice(i, i + CHUNK).map((path) => ({ upload_id: upload.id, path }));
    const { error } = await supabase.from("hard_disk_files").insert(rows);
    if (error) {
      // Clean up the upload record on failure
      await supabase.from("hard_disk_uploads").delete().eq("id", upload.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: upload.id, name, line_count: lines.length });
}

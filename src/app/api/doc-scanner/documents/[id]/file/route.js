import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { createClient } from "@supabase/supabase-js";

export async function GET(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  // Get the document record
  const { data: doc } = await supabase
    .from("doc_scanner_documents")
    .select("storage_path, file_type, file_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Download from storage
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const { data: fileData, error } = await admin.storage
    .from("documents")
    .download(doc.storage_path);

  if (error || !fileData) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  return new Response(buffer, {
    headers: {
      "Content-Type": doc.file_type,
      "Content-Disposition": `inline; filename="${doc.file_name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

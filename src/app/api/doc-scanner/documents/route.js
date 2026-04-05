import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { createClient } from "@supabase/supabase-js";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const category = searchParams.get("category") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const status = searchParams.get("status") || "";

  let query = supabase
    .from("doc_scanner_documents")
    .select("id, file_name, file_type, file_size, document_type, vendor, document_date, subtotal, tax, gst, total, currency, category, status, processing_error, llm_provider, notes, tags, custom_fields, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("document_date", from);
  if (to) query = query.lte("document_date", to);

  // Full-text search — use textSearch for longer queries, ilike for short ones
  if (search) {
    if (search.length >= 3) {
      query = query.textSearch("raw_text", search, { type: "plain" });
    } else {
      query = query.ilike("raw_text", `%${search}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("List documents error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data || [] });
}

export async function DELETE(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Get the storage path before deleting
  const { data: doc } = await supabase
    .from("doc_scanner_documents")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Delete from storage
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
  await admin.storage.from("documents").remove([doc.storage_path]);

  // Delete from database
  const { error } = await supabase
    .from("doc_scanner_documents")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { documentIds } = await req.json();

  // Load documents
  let query = supabase
    .from("doc_scanner_documents")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("document_date", { ascending: false });

  if (documentIds?.length > 0) {
    query = query.in("id", documentIds);
  }

  const { data: docs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!docs?.length) return NextResponse.json({ error: "No documents to export" }, { status: 400 });

  // Load custom fields for column headers
  const { data: customFields } = await supabase
    .from("doc_scanner_custom_fields")
    .select("field_name, field_key")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order");

  // Generate signed URLs for each document
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const signedUrls = {};
  for (const doc of docs) {
    const { data: signed } = await admin.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry
    signedUrls[doc.id] = signed?.signedUrl || "";
  }

  // Build CSV
  const baseHeaders = [
    "File Name", "Document Type", "Vendor", "Date", "Category",
    "Subtotal", "Tax", "GST", "Total", "Currency", "Notes", "Tags",
  ];
  const customHeaders = (customFields || []).map((f) => f.field_name);
  const headers = [...baseHeaders, ...customHeaders, "Download URL"];

  const rows = docs.map((doc) => {
    const base = [
      doc.file_name,
      doc.document_type,
      doc.vendor,
      doc.document_date,
      doc.category,
      doc.subtotal,
      doc.tax,
      doc.gst,
      doc.total,
      doc.currency,
      doc.notes,
      (doc.tags || []).join("; "),
    ];
    const custom = (customFields || []).map(
      (f) => doc.custom_fields?.[f.field_key] || ""
    );
    return [...base, ...custom, signedUrls[doc.id] || ""];
  });

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

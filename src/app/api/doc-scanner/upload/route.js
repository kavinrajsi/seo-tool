import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf",
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Generate a unique ID for the document
    const docId = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `${user.id}/${docId}.${ext}`;

    // Upload to Supabase Storage using service role for reliability
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await adminClient.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Create document record
    const { data: doc, error: insertError } = await supabase
      .from("doc_scanner_documents")
      .insert({
        id: docId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        status: "pending",
      })
      .select("id, status")
      .single();

    if (insertError) {
      // Clean up the uploaded file
      await adminClient.storage.from("documents").remove([storagePath]);
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

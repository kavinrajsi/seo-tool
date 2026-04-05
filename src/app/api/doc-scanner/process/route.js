import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { createClient } from "@supabase/supabase-js";
import { generateObject, generateText } from "ai";
import {
  getModel,
  extractionSchema,
  DEFAULT_MODELS,
  ensurePrompts,
} from "@/lib/doc-scanner";

export const maxDuration = 120;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { documentId } = await req.json();
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  // Load document
  const { data: doc } = await supabase
    .from("doc_scanner_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Set status to processing
  await supabase
    .from("doc_scanner_documents")
    .update({ status: "processing", processing_error: null })
    .eq("id", documentId);

  try {
    // Load user settings
    const { data: settings } = await supabase
      .from("doc_scanner_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let provider = settings?.preferred_provider || "anthropic";
    let modelId = settings?.preferred_model || DEFAULT_MODELS[provider];
    const autoCategorize = settings?.auto_categorize !== false;

    // Load API key for the selected provider, fall back to Anthropic
    let { data: keyRow } = await supabase
      .from("ai_api_keys")
      .select("api_key")
      .eq("provider", provider)
      .limit(1)
      .maybeSingle();

    if (!keyRow?.api_key && provider !== "anthropic") {
      const { data: fallback } = await supabase
        .from("ai_api_keys")
        .select("api_key")
        .eq("provider", "anthropic")
        .limit(1)
        .maybeSingle();
      if (fallback?.api_key) {
        keyRow = fallback;
        provider = "anthropic";
        modelId = DEFAULT_MODELS.anthropic;
      }
    }

    if (!keyRow?.api_key) {
      await supabase
        .from("doc_scanner_documents")
        .update({ status: "failed", processing_error: "No API key configured. Add one in Settings." })
        .eq("id", documentId);
      return NextResponse.json({ error: "No API key found. Add one in Settings." }, { status: 400 });
    }

    // Load prompts
    await ensurePrompts(supabase, user.id);
    const { data: prompts } = await supabase
      .from("doc_scanner_prompts")
      .select("prompt_key, prompt_text")
      .eq("user_id", user.id);

    const promptMap = {};
    for (const p of prompts || []) promptMap[p.prompt_key] = p.prompt_text;

    // Download file from Storage
    const admin = getAdminClient();
    const { data: fileData, error: dlError } = await admin.storage
      .from("documents")
      .download(doc.storage_path);

    if (dlError || !fileData) {
      throw new Error("Failed to download document from storage");
    }

    const arrayBuf = await fileData.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuf);

    // Build model
    const model = await getModel(provider, modelId, keyRow.api_key);

    // --- STEP 1: Core Extraction ---
    const { object: extracted, usage } = await generateObject({
      model,
      schema: extractionSchema,
      messages: [
        { role: "system", content: promptMap.extraction_system || "" },
        {
          role: "user",
          content: [
            { type: "image", image: fileBuffer, mimeType: doc.file_type },
            { type: "text", text: promptMap.extraction_fields || "Extract all fields from this document." },
          ],
        },
      ],
    });

    const totalTokens = (usage?.promptTokens || 0) + (usage?.completionTokens || 0);

    // --- STEP 2: Auto-Categorization ---
    let category = null;
    if (autoCategorize && promptMap.categorization) {
      const { data: categories } = await supabase
        .from("doc_scanner_categories")
        .select("name")
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      const categoryNames = (categories || []).map((c) => c.name).join(", ");
      const lineItemsSummary = (extracted.line_items || []).map((i) => i.name).join(", ");
      const rawSnippet = (extracted.raw_text || "").slice(0, 500);

      const catPrompt = promptMap.categorization
        .replace("{categories}", categoryNames)
        .replace("{vendor}", extracted.vendor || "Unknown")
        .replace("{line_items_summary}", lineItemsSummary || "N/A")
        .replace("{raw_text_snippet}", rawSnippet);

      const { text: catResult } = await generateText({
        model,
        prompt: catPrompt,
      });

      // Match against known categories — auto-create if new
      const catName = catResult.trim();
      const matched = (categories || []).find(
        (c) => c.name.toLowerCase() === catName.toLowerCase()
      );
      if (matched) {
        category = matched.name;
      } else if (catName) {
        // Auto-create the new category
        const { data: newCat } = await supabase
          .from("doc_scanner_categories")
          .insert({ user_id: user.id, name: catName })
          .select("name")
          .single();
        category = newCat?.name || catName;
      }
    }

    // --- STEP 3: Custom Fields ---
    const { data: customFields } = await supabase
      .from("doc_scanner_custom_fields")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const customValues = {};
    if (customFields?.length > 0 && promptMap.custom_field_base) {
      for (const field of customFields) {
        try {
          const fieldPrompt = promptMap.custom_field_base
            .replace("{raw_text}", extracted.raw_text || "")
            .replace("{user_prompt}", field.extraction_prompt);

          const { text: fieldResult } = await generateText({
            model,
            prompt: fieldPrompt,
          });
          customValues[field.field_key] = fieldResult.trim();
        } catch (err) {
          customValues[field.field_key] = "Error: " + err.message;
        }
      }
    }

    // --- Update document with all extracted data ---
    const { error: updateError } = await supabase
      .from("doc_scanner_documents")
      .update({
        vendor: extracted.vendor,
        document_date: extracted.document_date,
        subtotal: extracted.subtotal,
        tax: extracted.tax,
        gst: extracted.gst,
        total: extracted.total,
        currency: extracted.currency || settings?.default_currency || "INR",
        document_type: extracted.document_type,
        line_items: extracted.line_items || [],
        raw_text: extracted.raw_text,
        category,
        custom_fields: customValues,
        status: "completed",
        processing_error: null,
        llm_provider: provider,
        llm_model: modelId,
        processing_tokens: totalTokens,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) throw updateError;

    return NextResponse.json({ status: "completed", documentId });
  } catch (error) {
    console.error("Processing error:", error);
    await supabase
      .from("doc_scanner_documents")
      .update({ status: "failed", processing_error: error.message })
      .eq("id", documentId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

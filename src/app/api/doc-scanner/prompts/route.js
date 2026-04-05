import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { ensurePrompts, DEFAULT_PROMPTS } from "@/lib/doc-scanner";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  // Ensure defaults exist
  await ensurePrompts(supabase, user.id);

  const { data, error } = await supabase
    .from("doc_scanner_prompts")
    .select("*")
    .eq("user_id", user.id)
    .order("prompt_key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompts: data || [] });
}

export async function PATCH(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { id, prompt_text } = await req.json();
  if (!id || !prompt_text?.trim()) {
    return NextResponse.json({ error: "id and prompt_text required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("doc_scanner_prompts")
    .update({
      prompt_text: prompt_text.trim(),
      is_default: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — Reset a prompt to its default
export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { prompt_key } = await req.json();
  if (!prompt_key || !DEFAULT_PROMPTS[prompt_key]) {
    return NextResponse.json({ error: "Invalid prompt_key" }, { status: 400 });
  }

  const defaults = DEFAULT_PROMPTS[prompt_key];
  const { data, error } = await supabase
    .from("doc_scanner_prompts")
    .update({
      prompt_text: defaults.prompt_text,
      is_default: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("prompt_key", prompt_key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

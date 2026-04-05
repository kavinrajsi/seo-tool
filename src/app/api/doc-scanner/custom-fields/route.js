import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("doc_scanner_custom_fields")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: data || [] });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { field_name, field_type, extraction_prompt, select_options } = await req.json();
  if (!field_name?.trim() || !extraction_prompt?.trim()) {
    return NextResponse.json({ error: "field_name and extraction_prompt required" }, { status: 400 });
  }

  const field_key = field_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const { data, error } = await supabase
    .from("doc_scanner_custom_fields")
    .insert({
      user_id: user.id,
      field_name: field_name.trim(),
      field_key,
      field_type: field_type || "text",
      extraction_prompt: extraction_prompt.trim(),
      select_options: select_options || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["field_name", "field_type", "extraction_prompt", "select_options", "is_active", "sort_order"];
  const update = {};
  for (const key of allowed) {
    if (key in updates) update[key] = updates[key];
  }

  // If field_name changed, update field_key too
  if (update.field_name) {
    update.field_key = update.field_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  const { data, error } = await supabase
    .from("doc_scanner_custom_fields")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("doc_scanner_custom_fields")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

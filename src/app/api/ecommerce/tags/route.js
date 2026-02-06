import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: tags, error } = await admin
    .from("ecommerce_tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count products for each tag
  const tagsWithCount = await Promise.all(
    (tags || []).map(async (tag) => {
      const { count } = await admin
        .from("ecommerce_products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .ilike("tags", `%${tag.name}%`);

      return { ...tag, product_count: count || 0 };
    })
  );

  return NextResponse.json({ tags: tagsWithCount });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
  }

  // Check for duplicate
  const { data: existing } = await admin
    .from("ecommerce_tags")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", name.trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: "Tag already exists" }, { status: 400 });
  }

  const { data: tag, error } = await admin
    .from("ecommerce_tags")
    .insert({
      user_id: user.id,
      name: name.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag });
}

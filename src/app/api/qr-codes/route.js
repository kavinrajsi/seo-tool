import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function generateShortCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { content, label, backgroundColor, squaresColor, pixelsColor, style, pattern, originalUrl } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Generate unique short_code with retry on collision
  let shortCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    shortCode = generateShortCode();
    const { data: existing } = await admin
      .from("qr_codes")
      .select("id")
      .eq("short_code", shortCode)
      .single();
    if (!existing) break;
  }

  const { data, error } = await admin.from("qr_codes").insert({
    user_id: user.id,
    content: content.trim(),
    label: label?.trim() || null,
    background_color: backgroundColor || "#ffffff",
    squares_color: squaresColor || "#000000",
    pixels_color: pixelsColor || "#000000",
    style: style || "classic",
    pattern: pattern || "solid",
    short_code: shortCode,
    original_url: originalUrl?.trim() || null,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await admin
    .from("qr_codes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ qrCodes: data });
}

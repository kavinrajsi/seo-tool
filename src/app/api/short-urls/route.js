import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

function generateCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { originalUrl, customCode, title } = body;

  if (!originalUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  let fullUrl = originalUrl.trim();
  if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
    fullUrl = `https://${fullUrl}`;
  }

  if (!isValidUrl(fullUrl)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Generate or validate short code
  let code = customCode ? customCode.trim() : generateCode();

  if (customCode) {
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(code)) {
      return NextResponse.json({ error: "Custom code must be 3-30 alphanumeric characters, hyphens, or underscores" }, { status: 400 });
    }
    // Check uniqueness
    const { data: existing } = await admin
      .from("short_urls")
      .select("id")
      .eq("code", code)
      .single();
    if (existing) {
      return NextResponse.json({ error: "This custom code is already taken" }, { status: 409 });
    }
  } else {
    // Ensure generated code is unique (retry up to 5 times)
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await admin
        .from("short_urls")
        .select("id")
        .eq("code", code)
        .single();
      if (!existing) break;
      code = generateCode();
    }
  }

  const { data, error } = await admin.from("short_urls").insert({
    user_id: user.id,
    original_url: fullUrl,
    code,
    title: title?.trim() || null,
    clicks: 0,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  let query = admin
    .from("short_urls")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`original_url.ilike.%${search}%,title.ilike.%${search}%,code.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ urls: data, total: count, page, limit });
}

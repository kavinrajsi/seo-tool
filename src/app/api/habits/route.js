import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("habits")
    .select("id, title, description, icon, color, sort_order, created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ habits: data ?? [] });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { title, description, icon, color } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const { data, error } = await supabase
    .from("habits")
    .insert({ user_id: user.id, user_email: user.email, title: title.trim(), description, icon: icon ?? "✅", color: color ?? "blue" })
    .select("id, title, description, icon, color, sort_order, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ habit: data });
}

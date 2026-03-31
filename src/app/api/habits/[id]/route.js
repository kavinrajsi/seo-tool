import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function PATCH(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  const body = await req.json();
  const allowed = ["title", "description", "icon", "color", "sort_order", "is_active"];
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const { data, error } = await supabase
    .from("habits")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, description, icon, color, sort_order, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ habit: data });
}

export async function DELETE(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  // Soft delete — set is_active = false
  const { error } = await supabase
    .from("habits")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

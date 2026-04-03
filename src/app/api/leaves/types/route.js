import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase } = auth;

  const { data } = await supabase
    .from("leave_types")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return NextResponse.json({ types: data ?? [] });
}

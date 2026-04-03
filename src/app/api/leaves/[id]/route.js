import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function PATCH(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  const { data: emp } = await supabase
    .from("employees").select("id").eq("work_email", user.email).maybeSingle();
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const { data: request } = await supabase
    .from("leave_requests").select("*").eq("id", id).single();
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.employee_id !== emp.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (request.status !== "pending") return NextResponse.json({ error: "Can only cancel pending requests" }, { status: 400 });

  await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", id);
  return NextResponse.json({ ok: true });
}

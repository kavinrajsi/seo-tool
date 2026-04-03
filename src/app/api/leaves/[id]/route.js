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

  // Restore balance
  const year = new Date(request.from_date).getFullYear();
  const { data: balance } = await supabase
    .from("leave_balances")
    .select("id, used_days")
    .eq("employee_id", emp.id)
    .eq("leave_type_id", request.leave_type_id)
    .eq("year", year)
    .maybeSingle();

  if (balance) {
    await supabase.from("leave_balances")
      .update({ used_days: Math.max(0, Number(balance.used_days) - Number(request.total_days)) })
      .eq("id", balance.id);
  }

  return NextResponse.json({ ok: true });
}

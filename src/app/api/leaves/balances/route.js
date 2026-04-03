import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  const year = parseInt(searchParams.get("year") ?? new Date().getFullYear());

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const targetId = employeeId || emp.id;

  const { data } = await supabase
    .from("leave_balances")
    .select("*, leave_types(name, color, max_days)")
    .eq("employee_id", targetId)
    .eq("year", year);

  return NextResponse.json({ balances: data ?? [], year });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  const isAdmin = emp?.role === "admin" || emp?.role === "owner" || emp?.designation?.toLowerCase().includes("hr");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { employee_id, leave_type_id, year, allocated_days } = await req.json();
  if (!employee_id || !leave_type_id || !year) {
    return NextResponse.json({ error: "employee_id, leave_type_id, year required" }, { status: 400 });
  }

  const { error } = await supabase.from("leave_balances").upsert({
    employee_id, leave_type_id, year, allocated_days: allocated_days ?? 0,
  }, { onConflict: "employee_id,leave_type_id,year" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

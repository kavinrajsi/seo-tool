import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

function businessDays(from, to) {
  let count = 0;
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id").eq("work_email", user.email).maybeSingle();
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("leave_requests")
    .select("*, leave_types(name, color)")
    .eq("employee_id", emp.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id").eq("work_email", user.email).maybeSingle();
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const { leave_type_id, from_date, to_date, reason } = await req.json();
  if (!from_date || !to_date) {
    return NextResponse.json({ error: "from_date and to_date required" }, { status: 400 });
  }

  const totalDays = businessDays(from_date, to_date);
  if (totalDays <= 0) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });

  // Check overlap
  const { data: overlap } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("employee_id", emp.id)
    .in("status", ["pending", "approved"])
    .lte("from_date", to_date)
    .gte("to_date", from_date)
    .maybeSingle();
  if (overlap) return NextResponse.json({ error: "You already have a leave request overlapping these dates" }, { status: 409 });

  const { error } = await supabase.from("leave_requests").insert({
    employee_id: emp.id,
    leave_type_id: leave_type_id || null,
    from_date,
    to_date,
    total_days: totalDays,
    reason: reason?.trim() || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycle_id");

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  const isAdmin = emp?.role === "admin" || emp?.role === "owner" || emp?.designation?.toLowerCase().includes("hr");

  // Get cycles
  const { data: cycles } = await supabase.from("review_cycles").select("*").order("start_date", { ascending: false });

  if (!cycleId) return NextResponse.json({ cycles: cycles ?? [], is_admin: isAdmin });

  // Get reviews for a cycle
  let query = supabase
    .from("performance_reviews")
    .select("*, employees!performance_reviews_employee_id_fkey(first_name, last_name, department, designation), performance_goals(*)")
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });

  if (!isAdmin) query = query.eq("employee_id", emp.id);

  const { data: reviews } = await query;

  return NextResponse.json({ cycles: cycles ?? [], reviews: reviews ?? [], is_admin: isAdmin, my_employee_id: emp?.id });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  const isAdmin = emp?.role === "admin" || emp?.role === "owner" || emp?.designation?.toLowerCase().includes("hr");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, ...body } = await req.json();

  if (action === "create_cycle") {
    const { name, start_date, end_date } = body;
    if (!name || !start_date || !end_date) return NextResponse.json({ error: "name, start_date, end_date required" }, { status: 400 });
    const { error } = await supabase.from("review_cycles").insert({ name, start_date, end_date });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "init_reviews") {
    const { cycle_id } = body;
    if (!cycle_id) return NextResponse.json({ error: "cycle_id required" }, { status: 400 });
    const { data: employees } = await supabase
      .from("employees").select("id").neq("employee_status", "inactive");
    if (!employees?.length) return NextResponse.json({ error: "No active employees" }, { status: 400 });

    const rows = employees.map((e) => ({ cycle_id, employee_id: e.id }));
    const { error } = await supabase.from("performance_reviews").upsert(rows, { onConflict: "cycle_id,employee_id", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: rows.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export const maxDuration = 60;

function getWeekStart(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function isAdminEmp(emp) {
  return emp?.role === "admin" || emp?.role === "owner" ||
    emp?.designation?.toLowerCase().includes("hr");
}

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const weekStart = toISODate(getWeekStart());
  const { searchParams } = new URL(req.url);

  // WIP limit (shared for both views)
  const { data: settings } = await supabase
    .from("capacity_settings").select("wip_limit").limit(1).maybeSingle();
  const wipLimit = settings?.wip_limit ?? 5;

  // ── Team view (admin only) ────────────────────────────────────────────────
  if (searchParams.get("view") === "team") {
    if (!isAdminEmp(emp)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // All active employees
    const { data: allEmps } = await supabase
      .from("employees")
      .select("id, first_name, last_name, designation")
      .or("employee_status.is.null,employee_status.neq.inactive")
      .order("first_name");

    // This week's check-ins for everyone
    const { data: checkins } = await supabase
      .from("capacity_checkins")
      .select("employee_id, load_scale, at_risk, notes, updated_at")
      .eq("week_start", weekStart);

    const checkinMap = {};
    for (const c of checkins ?? []) checkinMap[c.employee_id] = c;

    // Basecamp todo counts (best-effort)
    let basecampMap = {};
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const bcRes = await fetch(`${appUrl}/api/basecamp/assignments`, {
        headers: { Authorization: req.headers.get("authorization") },
        signal: AbortSignal.timeout(15000),
      });
      if (bcRes.ok) {
        const bcData = await bcRes.json();
        for (const a of bcData.assignments ?? []) {
          basecampMap[a.person.name.trim().toLowerCase()] = a.todos.length;
        }
      }
    } catch {
      // Basecamp unavailable — graceful degradation
    }

    const team = (allEmps ?? []).map((e) => {
      const fullName = `${e.first_name} ${e.last_name}`.trim().toLowerCase();
      const todoCount = basecampMap[fullName] ?? null;
      return {
        employee_id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        designation: e.designation || null,
        checkin: checkinMap[e.id] ?? null,
        todo_count: todoCount,
        over_wip: todoCount !== null && todoCount >= wipLimit,
      };
    });

    return NextResponse.json({ week_start: weekStart, wip_limit: wipLimit, team, is_admin: true });
  }

  // ── Personal view ─────────────────────────────────────────────────────────
  const { data: checkin } = await supabase
    .from("capacity_checkins")
    .select("load_scale, at_risk, notes, updated_at")
    .eq("employee_id", emp.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  const { data: history } = await supabase
    .from("capacity_checkins")
    .select("week_start, load_scale, at_risk, notes")
    .eq("employee_id", emp.id)
    .order("week_start", { ascending: false })
    .limit(8);

  return NextResponse.json({
    week_start: weekStart,
    checkin: checkin ?? null,
    history: history ?? [],
    wip_limit: wipLimit,
    is_admin: isAdminEmp(emp),
  });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const { action, ...body } = await req.json();
  const weekStart = toISODate(getWeekStart());

  if (action === "submit_checkin") {
    const { load_scale, at_risk = false, notes = "" } = body;
    if (!load_scale || load_scale < 1 || load_scale > 5) {
      return NextResponse.json({ error: "load_scale must be 1–5" }, { status: 400 });
    }
    const { error } = await supabase.from("capacity_checkins").upsert({
      employee_id: emp.id,
      week_start: weekStart,
      load_scale,
      at_risk,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "employee_id,week_start" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, week_start: weekStart });
  }

  if (action === "update_wip_limit") {
    if (!isAdminEmp(emp)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { wip_limit } = body;
    if (!wip_limit || wip_limit < 1) return NextResponse.json({ error: "wip_limit must be ≥ 1" }, { status: 400 });
    const { data: existing } = await supabase.from("capacity_settings").select("id").limit(1).maybeSingle();
    if (existing) {
      await supabase.from("capacity_settings").update({ wip_limit, updated_by: emp.id, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("capacity_settings").insert({ wip_limit, updated_by: emp.id });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

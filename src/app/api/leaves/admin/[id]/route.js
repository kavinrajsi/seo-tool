import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function PATCH(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  const isAdmin = emp?.role === "admin" || emp?.role === "owner" || emp?.designation?.toLowerCase().includes("hr");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, reviewer_note } = await req.json();
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const { data: request } = await supabase
    .from("leave_requests").select("*").eq("id", id).single();
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Can only act on pending requests" }, { status: 400 });

  const newStatus = action === "approve" ? "approved" : "rejected";
  await supabase.from("leave_requests").update({
    status: newStatus,
    reviewed_by: emp.id,
    reviewer_note: reviewer_note?.trim() || null,
    reviewed_at: new Date().toISOString(),
  }).eq("id", id);

  // If rejected, restore balance
  if (newStatus === "rejected") {
    const year = new Date(request.from_date).getFullYear();
    const { data: balance } = await supabase
      .from("leave_balances")
      .select("id, used_days")
      .eq("employee_id", request.employee_id)
      .eq("leave_type_id", request.leave_type_id)
      .eq("year", year)
      .maybeSingle();

    if (balance) {
      await supabase.from("leave_balances")
        .update({ used_days: Math.max(0, Number(balance.used_days) - Number(request.total_days)) })
        .eq("id", balance.id);
    }
  }

  return NextResponse.json({ ok: true });
}

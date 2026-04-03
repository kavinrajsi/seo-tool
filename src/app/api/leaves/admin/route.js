import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  const isAdmin = emp?.role === "admin" || emp?.role === "owner" || emp?.designation?.toLowerCase().includes("hr");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("leave_requests")
    .select("*, employees(first_name, last_name, employee_number, department), leave_types(name, color)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  const requests = data ?? [];

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return NextResponse.json({ requests, stats, can_manage: true });
}

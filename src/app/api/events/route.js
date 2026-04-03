import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: employee } = await supabase
    .from("employees").select("role, designation").eq("work_email", user.email).maybeSingle();

  const can_create =
    employee?.role === "admin" ||
    employee?.role === "owner" ||
    !!(employee?.designation?.toLowerCase().includes("hr"));

  const { data: events, error } = await supabase
    .from("events")
    .select("*, event_registrations(id, user_id, status, user_name, user_email)")
    .order("event_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const processed = (events ?? []).map((ev) => {
    const regs = ev.event_registrations ?? [];
    return {
      id: ev.id,
      created_by: ev.created_by,
      creator_email: ev.creator_email,
      creator_name: ev.creator_name,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      event_date: ev.event_date,
      end_date: ev.end_date,
      cover_emoji: ev.cover_emoji,
      created_at: ev.created_at,
      going: regs.filter((r) => r.status === "going").length,
      not_going: regs.filter((r) => r.status === "not_going").length,
      total_registered: regs.length,
      my_status: regs.find((r) => r.user_id === user.id)?.status ?? null,
    };
  });

  return NextResponse.json({ events: processed, can_create });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { title, description, location, event_date, end_date, cover_emoji } = await req.json();

  if (!title?.trim() || !event_date) {
    return NextResponse.json({ error: "title and event_date required" }, { status: 400 });
  }

  const { data: employee } = await supabase
    .from("employees").select("role, designation").eq("work_email", user.email).maybeSingle();

  const can_create =
    employee?.role === "admin" ||
    employee?.role === "owner" ||
    !!(employee?.designation?.toLowerCase().includes("hr"));

  if (!can_create) return NextResponse.json({ error: "Not authorized to create events" }, { status: 403 });

  const creator_name =
    user.user_metadata?.full_name ||
    user.email.split("@")[0].replace(/[._-]+/g, " ");

  const { data, error } = await supabase
    .from("events")
    .insert({
      created_by: user.id,
      creator_email: user.email,
      creator_name,
      title: title.trim(),
      description: description?.trim() || null,
      location: location?.trim() || null,
      event_date,
      end_date: end_date || null,
      cover_emoji: cover_emoji ?? "🎉",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

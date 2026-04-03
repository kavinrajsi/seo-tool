import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function POST(req, { params }) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;
  const { id } = await params;

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", id)
    .single();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status } = await req.json();

  if (!status) {
    await supabase
      .from("event_registrations")
      .delete()
      .eq("event_id", id)
      .eq("user_id", user.id);
  } else {
    const user_name =
      user.user_metadata?.full_name ||
      user.email.split("@")[0].replace(/[._-]+/g, " ");

    const { error } = await supabase.from("event_registrations").upsert(
      { event_id: id, user_id: user.id, user_email: user.email, user_name, status },
      { onConflict: "event_id,user_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;

  // Verify ownership
  const { data: team } = await supabase
    .from("teams")
    .select("id, owner_id")
    .eq("id", id)
    .single();

  if (!team || team.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Don't allow removing the owner
  const { data: member } = await supabase
    .from("team_members")
    .select("id, role")
    .eq("id", memberId)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.role === "owner") {
    return NextResponse.json({ error: "Cannot remove team owner" }, { status: 400 });
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

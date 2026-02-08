import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { canChangeRole, ROLES } from "@/lib/permissions";

const ASSIGNABLE_ROLES = [ROLES.VIEWER, ROLES.EDITOR, ROLES.ADMIN];

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const { role: newRole } = await request.json();

  if (!newRole || !ASSIGNABLE_ROLES.includes(newRole)) {
    return NextResponse.json(
      { error: "Invalid role. Must be viewer, editor, or admin" },
      { status: 400 }
    );
  }

  // Fetch actor's membership
  const { data: actor } = await admin
    .from("team_members")
    .select("id, role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .single();

  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch target member
  const { data: target } = await admin
    .from("team_members")
    .select("id, role, user_id")
    .eq("id", memberId)
    .eq("team_id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === ROLES.OWNER) {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 });
  }

  if (!canChangeRole(actor.role, target.role, newRole)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { data: updated, error } = await admin
    .from("team_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: updated });
}

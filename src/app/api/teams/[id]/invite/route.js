import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { canInvite, ROLES } from "@/lib/permissions";

const ASSIGNABLE_ROLES = [ROLES.VIEWER, ROLES.EDITOR, ROLES.ADMIN];

export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch actor's membership to check permissions
  const { data: actor } = await admin
    .from("team_members")
    .select("id, role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .single();

  if (!actor || !canInvite(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role } = await request.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Validate and default the role
  const assignedRole = role && ASSIGNABLE_ROLES.includes(role) ? role : ROLES.VIEWER;

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";

  // Check if already a member
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.trim())
    .single();

  if (existingProfile) {
    const { data: existingMember } = await admin
      .from("team_members")
      .select("id")
      .eq("team_id", id)
      .eq("user_id", existingProfile.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
    }

    // Add directly if user exists
    await admin.from("team_members").insert({
      team_id: id,
      user_id: existingProfile.id,
      role: assignedRole,
      invited_email: email.trim(),
    });
  } else {
    // Send Supabase invite email for new users
    try {
      await admin.auth.admin.inviteUserByEmail(email.trim(), {
        redirectTo: `${origin}/dashboard/teams`,
      });
    } catch {
      // Silent fail — invitation record is still created below
    }
  }

  // Create invitation record
  const { data: invitation, error } = await admin
    .from("team_invitations")
    .insert({
      team_id: id,
      invited_by: user.id,
      email: email.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(invitation, { status: 201 });
}

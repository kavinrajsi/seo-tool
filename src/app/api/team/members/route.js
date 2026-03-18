import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendInvitationEmail } from "@/lib/resend";

// GET: list members of a team
export async function GET(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    // Verify user is a team member
    const { data: self } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!self) return NextResponse.json({ error: "Not a team member" }, { status: 403 });

    // Get members
    const { data: members } = await supabase
      .from("team_members")
      .select("id, user_id, role, joined_at")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });

    // Get user emails via auth (we need to look up each user)
    // Since we can't query auth.users directly from client, we'll use a workaround
    // Store email in team_members or fetch from auth session
    // For now, return user_ids and the client can match the current user
    const { data: invitations } = await supabase
      .from("team_invitations")
      .select("id, email, role, created_at, expires_at, accepted_at")
      .eq("team_id", teamId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());

    return NextResponse.json({ members: members || [], invitations: invitations || [], userRole: self.role });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: invite a new member
export async function POST(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { teamId, email, role = "member" } = await req.json();
    if (!teamId || !email) {
      return NextResponse.json({ error: "teamId and email are required" }, { status: 400 });
    }

    if (!["viewer", "member", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check admin/member role (only admins can invite)
    const { data: self } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!self || self.role !== "admin") {
      return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 });
    }

    // Check for existing pending invitation
    const { data: existing } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("team_id", teamId)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Invitation already pending for this email" }, { status: 409 });
    }

    // Get team name
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .single();

    // Create invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    const { error: inviteError } = await supabase
      .from("team_invitations")
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Send invitation email
    const origin = new URL(req.url).origin;
    try {
      await sendInvitationEmail({
        to: email.toLowerCase(),
        teamName: team?.name || "a team",
        inviterEmail: user.email,
        role,
        acceptUrl: `${origin}/api/team/invite/accept?token=${token}`,
      });
    } catch {
      // Email failed but invitation is created — user can still share the link
      console.error("Failed to send invitation email, but invitation was created");
    }

    return NextResponse.json({ success: true, token });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: change a member's role
export async function PATCH(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { teamId, memberId, role } = await req.json();
    if (!teamId || !memberId || !role) {
      return NextResponse.json({ error: "teamId, memberId, and role required" }, { status: 400 });
    }

    if (!["viewer", "member", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check admin role
    const { data: self } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!self || self.role !== "admin") {
      return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
    }

    // Can't change own role (prevent last admin demotion)
    const { data: target } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("id", memberId)
      .single();

    if (target?.user_id === user.id) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const { error } = await supabase
      .from("team_members")
      .update({ role })
      .eq("id", memberId)
      .eq("team_id", teamId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: remove a member or cancel invitation
export async function DELETE(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { teamId, memberId, invitationId } = await req.json();
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    // Check admin role
    const { data: self } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!self || self.role !== "admin") {
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
    }

    if (invitationId) {
      // Cancel invitation
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", invitationId)
        .eq("team_id", teamId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (memberId) {
      // Can't remove yourself
      const { data: target } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("id", memberId)
        .single();

      if (target?.user_id === user.id) {
        return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
      }

      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId)
        .eq("team_id", teamId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

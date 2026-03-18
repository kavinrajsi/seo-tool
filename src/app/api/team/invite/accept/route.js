import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const origin = new URL(req.url).origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/signin?error=invalid_token`);
  }

  try {
    // Look up invitation
    const { data: invitation } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    if (!invitation) {
      return NextResponse.redirect(`${origin}/signin?error=invalid_invitation`);
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.redirect(`${origin}/signin?error=invitation_expired`);
    }

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to sign in, then back to accept
      return NextResponse.redirect(
        `${origin}/signin?redirect=${encodeURIComponent(`/api/team/invite/accept?token=${token}`)}`
      );
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", invitation.team_id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Already a member, just redirect
      return NextResponse.redirect(`${origin}/team`);
    }

    // Add user to team
    const { error: memberError } = await supabase
      .from("team_members")
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError) {
      console.error("Failed to add team member:", memberError);
      return NextResponse.redirect(`${origin}/team?error=join_failed`);
    }

    // Mark invitation as accepted
    await supabase
      .from("team_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return NextResponse.redirect(`${origin}/team?joined=${invitation.team_id}`);
  } catch (err) {
    console.error("Invite accept error:", err);
    return NextResponse.redirect(`${origin}/signin?error=server_error`);
  }
}

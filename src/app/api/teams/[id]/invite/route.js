import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const { data: team } = await admin
    .from("teams")
    .select("id, owner_id")
    .eq("id", id)
    .single();

  if (!team || team.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

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
      role: "member",
      invited_email: email.trim(),
    });
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

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export const maxDuration = 30;

// GET: list teams for current user
export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, role, teams(id, name, created_at)")
      .eq("user_id", user.id);

    const teams = (memberships || []).map((m) => ({
      id: m.teams.id,
      name: m.teams.name,
      role: m.role,
      created_at: m.teams.created_at,
    }));

    return NextResponse.json({ teams });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: create a new team
export async function POST(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    // Create team via SECURITY DEFINER RPC (trigger auto-adds creator as admin)
    const { data: team, error: teamError } = await supabase
      .rpc("create_team", { p_name: name.trim(), p_created_by: user.id })
      .single();

    if (teamError) {
      const msg = teamError.message.includes("teams_name_unique")
        ? "A team with this name already exists"
        : teamError.message;
      return NextResponse.json({ error: msg }, { status: teamError.message.includes("teams_name_unique") ? 409 : 500 });
    }

    return NextResponse.json({ team: { ...team, role: "admin" } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: update team name
export async function PATCH(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { teamId, name } = await req.json();
    if (!teamId || !name?.trim()) {
      return NextResponse.json({ error: "teamId and name are required" }, { status: 400 });
    }

    // Check admin role
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "admin") {
      return NextResponse.json({ error: "Only admins can update team settings" }, { status: 403 });
    }

    const { data: team, error } = await supabase
      .from("teams")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", teamId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ team });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: delete a team
export async function DELETE(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { teamId } = await req.json();
    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    // Check admin role
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete teams" }, { status: 403 });
    }

    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

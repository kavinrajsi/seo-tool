import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";
import { bcFetchAll } from "@/lib/basecamp";

export const maxDuration = 60;

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: tokenRow } = await supabase
      .from("basecamp_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Basecamp not connected" }, { status: 403 });
    }

    const { access_token, account_id } = tokenRow;

    const people = await bcFetchAll(
      `https://3.basecampapi.com/${account_id}/people.json`,
      access_token
    );

    for (const p of people) {
      await supabase.from("basecamp_people").upsert({
        user_id: user.id,
        basecamp_id: p.id,
        name: p.name || "",
        email: p.email_address || "",
        avatar_url: p.avatar_url || "",
        title: p.title || "",
        admin: p.admin || false,
        owner: p.owner || false,
        personable_type: p.personable_type || "",
        company_name: p.company?.name || "",
        app_url: p.app_url || "",
        created_at_basecamp: p.created_at || null,
        updated_at_basecamp: p.updated_at || null,
        synced_at: new Date().toISOString(),
      }, { onConflict: "user_id,basecamp_id" });
    }

    const { data: stored } = await supabase
      .from("basecamp_people")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    return NextResponse.json({ people: stored || [] });
  } catch (err) {
    logError("basecamp/people", err);
    return NextResponse.json({ error: err.message || "Failed to sync people" }, { status: 500 });
  }
}

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

    const projects = await bcFetchAll(
      `https://3.basecampapi.com/${tokenRow.account_id}/projects.json`,
      tokenRow.access_token
    );

    for (const p of projects) {
      await supabase.from("basecamp_projects").upsert({
        user_id: user.id,
        basecamp_id: p.id,
        name: p.name,
        description: p.description || "",
        status: p.status || "active",
        url: p.url || "",
        app_url: p.app_url || "",
        bookmark_url: p.bookmark_url || "",
        created_at_basecamp: p.created_at || null,
        updated_at_basecamp: p.updated_at || null,
        synced_at: new Date().toISOString(),
      }, { onConflict: "user_id,basecamp_id" });
    }

    const { data: stored } = await supabase
      .from("basecamp_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    return NextResponse.json({ projects: stored || [] });
  } catch (err) {
    logError("basecamp/projects", err);
    return NextResponse.json({ error: err.message || "Failed to sync projects" }, { status: 500 });
  }
}

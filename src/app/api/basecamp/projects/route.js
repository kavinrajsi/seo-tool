import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: config } = await supabase
      .from("basecamp_config")
      .select("account_id, access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!config) {
      return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });
    }

    const { account_id, access_token } = config;
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "SEO Tool (tool.madarth.com)",
    };

    // Fetch all projects
    const projRes = await fetch(
      `https://3.basecampapi.com/${account_id}/projects.json`,
      { headers }
    );
    if (!projRes.ok) {
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 502 });
    }
    const projects = await projRes.json();

    // Fetch webhooks for each project
    const result = [];
    for (const project of projects) {
      let webhooks = [];
      try {
        const whRes = await fetch(
          `https://3.basecampapi.com/${account_id}/buckets/${project.id}/webhooks.json`,
          { headers }
        );
        if (whRes.ok) {
          webhooks = await whRes.json();
        }
      } catch {}

      result.push({
        id: project.id,
        name: project.name,
        status: project.status || "active",
        app_url: project.app_url || "",
        webhooks: webhooks.map((w) => ({
          id: w.id,
          payload_url: w.payload_url,
          active: w.active,
          created_at: w.created_at,
        })),
      });
    }

    return NextResponse.json({ projects: result });
  } catch (err) {
    logError("basecamp/projects", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

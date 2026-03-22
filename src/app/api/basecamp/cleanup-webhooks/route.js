import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

export async function POST(req) {
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

    const projRes = await fetch(
      `https://3.basecampapi.com/${account_id}/projects.json`,
      { headers }
    );
    if (!projRes.ok) {
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 502 });
    }
    const projects = await projRes.json();

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://tool.madarth.com"}/api/basecamp/webhook`;
    let totalRemoved = 0;

    for (const project of projects) {
      try {
        const listRes = await fetch(
          `https://3.basecampapi.com/${account_id}/buckets/${project.id}/webhooks.json`,
          { headers }
        );
        if (!listRes.ok) continue;

        const webhooks = await listRes.json();
        const matching = webhooks.filter((w) => w.payload_url === webhookUrl);

        // Keep the first one, delete the rest
        for (let i = 1; i < matching.length; i++) {
          await fetch(
            `https://3.basecampapi.com/${account_id}/buckets/${project.id}/webhooks/${matching[i].id}.json`,
            { method: "DELETE", headers }
          );
          totalRemoved++;
        }
      } catch {}
    }

    return NextResponse.json({
      cleaned: totalRemoved,
      projects: projects.length,
    });
  } catch (err) {
    logError("basecamp/cleanup-webhooks", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

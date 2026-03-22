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
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!config) {
      return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });
    }

    const { account_id, access_token } = config;
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      "User-Agent": "SEO Tool (tool.madarth.com)",
    };

    // Get all projects (with pagination)
    const projects = [];
    let nextUrl = `https://3.basecampapi.com/${account_id}/projects.json`;
    while (nextUrl) {
      const projRes = await fetch(nextUrl, { headers });
      if (!projRes.ok) {
        return NextResponse.json({ error: "Failed to fetch projects from Basecamp" }, { status: 502 });
      }
      const page = await projRes.json();
      projects.push(...page);
      const linkHeader = projRes.headers.get("Link") || "";
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = match ? match[1] : null;
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://tool.madarth.com"}/api/basecamp/webhook`;
    const registered = [];
    const skipped = [];
    const errors = [];

    for (const project of projects) {
      try {
        // Check if webhook already exists for this project
        const listRes = await fetch(
          `https://3.basecampapi.com/${account_id}/buckets/${project.id}/webhooks.json`,
          { headers }
        );

        if (listRes.ok) {
          const existing = await listRes.json();
          const alreadyRegistered = existing.some((w) => w.payload_url === webhookUrl);
          if (alreadyRegistered) {
            skipped.push(project.name);
            continue;
          }
        }

        // Register new webhook
        const res = await fetch(
          `https://3.basecampapi.com/${account_id}/buckets/${project.id}/webhooks.json`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ payload_url: webhookUrl }),
          }
        );

        if (res.ok || res.status === 201) {
          registered.push(project.name);
        } else {
          const errData = await res.text();
          errors.push({ project: project.name, error: errData });
        }
      } catch (err) {
        errors.push({ project: project.name, error: err.message });
      }
    }

    // Save all projects with webhooks to config
    await supabase
      .from("basecamp_config")
      .update({ webhook_projects: [...skipped, ...registered], updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({
      registered: registered.length,
      skipped: skipped.length,
      total: projects.length,
      projects: registered,
      skippedProjects: skipped,
      errors,
    });
  } catch (err) {
    logError("basecamp/register-webhooks", err);
    return NextResponse.json({ error: err.message || "Failed to register webhooks" }, { status: 500 });
  }
}

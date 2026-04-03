import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

const STATUS_LABELS = { green: "On Track", yellow: "At Risk", red: "Blocked" };
const STATUS_EMOJI  = { green: "🟢", yellow: "🟡", red: "🔴" };

function listItems(text) {
  return (text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `<li>${s}</li>`)
    .join("");
}

function buildDocContent({ projectName, status, onTrack, atRisk, blocked, nextWeek, updatedBy }) {
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const emoji = STATUS_EMOJI[status] ?? "🟢";
  const label = STATUS_LABELS[status] ?? "On Track";

  return `<h1>PM Dashboard — ${projectName}</h1>
<p><em>Last updated: ${date}${updatedBy ? ` · ${updatedBy}` : ""}</em></p>
<hr>
<h2>${emoji} Overall Status: ${label}</h2>
<hr>
<h2>✅ What's On Track</h2>
<ul>${listItems(onTrack) || "<li>—</li>"}</ul>
<h2>⚠️ What's At Risk</h2>
<ul>${listItems(atRisk) || "<li>—</li>"}</ul>
<h2>🚫 Who's Blocked</h2>
<ul>${listItems(blocked) || "<li>—</li>"}</ul>
<h2>🎯 Next Week's Priorities</h2>
<ol>${listItems(nextWeek) || "<li>—</li>"}</ol>`;
}

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: config } = await supabase
      .from("basecamp_config").select("account_id, access_token").eq("user_id", user.id).maybeSingle();
    if (!config) return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });

    const { account_id, access_token } = config;
    const bcHeaders = {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "SEO Tool (tool.madarth.com)",
    };

    // Fetch all active projects (paginated)
    const projects = [];
    let nextUrl = `https://3.basecampapi.com/${account_id}/projects.json`;
    while (nextUrl) {
      const res = await fetch(nextUrl, { headers: bcHeaders });
      if (!res.ok) break;
      const page = await res.json();
      projects.push(...page);
      const link = res.headers.get("Link") || "";
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = m ? m[1] : null;
    }

    // Our stored metadata
    const { data: stored } = await supabase
      .from("pm_dashboards").select("*").eq("user_id", user.id);
    const storedMap = {};
    for (const s of stored ?? []) storedMap[s.project_id] = s;

    const result = projects
      .filter((p) => p.status !== "archived" && p.status !== "trashed")
      .map((p) => {
        // Find vault from dock
        const vaultDock = (p.dock ?? []).find((d) => d.name === "Vault");
        const vaultId = vaultDock?.id ?? null;
        const stored = storedMap[p.id] ?? null;
        return {
          project_id: p.id,
          project_name: p.name,
          app_url: p.app_url,
          vault_id: vaultId,
          doc_id: stored?.doc_id ?? null,
          doc_url: stored?.doc_url ?? null,
          status: stored?.status ?? null,
          last_updated: stored?.last_updated ?? null,
        };
      });

    return NextResponse.json({ projects: result });
  } catch (err) {
    logError("basecamp/pm-dashboard GET", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: config } = await supabase
      .from("basecamp_config").select("account_id, access_token").eq("user_id", user.id).maybeSingle();
    if (!config) return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });

    const { account_id, access_token } = config;
    const bcHeaders = {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "SEO Tool (tool.madarth.com)",
      "Content-Type": "application/json",
    };
    const base = `https://3.basecampapi.com/${account_id}`;

    const { project_id, project_name, vault_id, doc_id, status, on_track, at_risk, blocked, next_week, updated_by } = await req.json();

    if (!project_id || !vault_id) {
      return NextResponse.json({ error: "project_id and vault_id required" }, { status: 400 });
    }

    const content = buildDocContent({ projectName: project_name, status, onTrack: on_track, atRisk: at_risk, blocked, nextWeek: next_week, updatedBy: updated_by });
    const title = `PM Dashboard — ${project_name}`;

    let newDocId = doc_id;
    let docAppUrl = null;

    if (doc_id) {
      // Update existing document
      const res = await fetch(`${base}/buckets/${project_id}/documents/${doc_id}.json`, {
        method: "PUT",
        headers: bcHeaders,
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Basecamp update failed: ${err}` }, { status: 502 });
      }
      const doc = await res.json();
      docAppUrl = doc.app_url ?? null;
    } else {
      // Create new document in vault
      const res = await fetch(`${base}/buckets/${project_id}/vaults/${vault_id}/documents.json`, {
        method: "POST",
        headers: bcHeaders,
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Basecamp create failed: ${err}` }, { status: 502 });
      }
      const doc = await res.json();
      newDocId = doc.id;
      docAppUrl = doc.app_url ?? null;
    }

    // Persist metadata in our DB
    await supabase.from("pm_dashboards").upsert({
      user_id: user.id,
      project_id,
      project_name,
      vault_id,
      doc_id: newDocId,
      doc_url: docAppUrl,
      status,
      last_updated: new Date().toISOString(),
    }, { onConflict: "user_id,project_id" });

    return NextResponse.json({ ok: true, doc_id: newDocId, doc_url: docAppUrl });
  } catch (err) {
    logError("basecamp/pm-dashboard POST", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

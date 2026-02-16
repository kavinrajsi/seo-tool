import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole, getAccessibleProjectIds } from "@/lib/projectAccess";
import { canEditProjectData } from "@/lib/permissions";

function parseLlmsTxt(content) {
  if (!content) return { title: null, description: null, sections: [], linkCount: 0, sectionCount: 0 };

  const lines = content.split("\n");
  let title = null;
  let description = null;
  const sections = [];
  let currentSection = null;
  let linkCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!title && /^#\s+/.test(trimmed) && !/^##/.test(trimmed)) {
      title = trimmed.replace(/^#\s+/, "").trim();
      continue;
    }

    if (!description && /^>\s*/.test(trimmed)) {
      description = trimmed.replace(/^>\s*/, "").trim();
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      currentSection = { title: trimmed.replace(/^##\s+/, "").trim(), links: [] };
      sections.push(currentSection);
      continue;
    }

    const linkMatch = trimmed.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/);
    if (linkMatch) {
      linkCount++;
      if (currentSection) {
        currentSection.links.push({
          title: linkMatch[1],
          url: linkMatch[2],
          description: linkMatch[3] || null,
        });
      }
    }
  }

  return { title, description, sections, linkCount, sectionCount: sections.length };
}

async function fetchLlmsTxtContent(domain) {
  let origin = domain.trim();
  if (!/^https?:\/\//i.test(origin)) {
    origin = "https://" + origin;
  }
  try {
    origin = new URL(origin).origin;
  } catch {
    return { error: "Invalid domain" };
  }

  async function tryFetch(url) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "FireflyBot/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const text = await res.text();
      return text && text.trim().length > 0 ? text : null;
    } catch {
      return null;
    }
  }

  const [llmsTxt, llmsFullTxt] = await Promise.all([
    tryFetch(`${origin}/llms.txt`),
    tryFetch(`${origin}/llms-full.txt`),
  ]);

  const llmsExists = !!llmsTxt;
  const llmsFullExists = !!llmsFullTxt;
  const parsed = parseLlmsTxt(llmsTxt);

  const issues = [];
  const recommendations = [];

  if (!llmsExists && !llmsFullExists) {
    issues.push("No /llms.txt file found.", "No /llms-full.txt file found.");
    recommendations.push(
      "Create a /llms.txt file to help LLMs understand your site.",
      "Include a title (#), description (>), sections (##), and markdown links.",
      "Optionally create /llms-full.txt with extended content."
    );
  } else {
    if (!llmsExists && llmsFullExists) {
      issues.push("/llms.txt not found, but /llms-full.txt exists.");
      recommendations.push("Create a /llms.txt file as the primary entry point for LLMs.");
    }
    if (llmsExists) {
      if (!parsed.title) {
        issues.push("llms.txt is missing a title (# heading).");
        recommendations.push("Add a # Title as the first heading in your llms.txt.");
      }
      if (!parsed.description) {
        issues.push("llms.txt is missing a description (> blockquote).");
        recommendations.push("Add a > description blockquote after the title.");
      }
      if (parsed.sectionCount === 0) {
        issues.push("llms.txt has no sections (## headings).");
        recommendations.push("Add ## sections to organize your content links.");
      }
      if (parsed.linkCount === 0) {
        issues.push("llms.txt has no markdown links.");
        recommendations.push("Add links in the format: - [Title](URL): description");
      }
    }
  }

  const hasComplete = llmsExists && parsed.title && parsed.description && parsed.sectionCount > 0 && parsed.linkCount > 0;
  const score = hasComplete ? "pass" : (llmsExists || llmsFullExists) ? "warning" : "fail";

  return {
    domain: origin,
    llmsExists,
    llmsFullExists,
    title: parsed.title,
    description: parsed.description,
    sections: parsed.sections,
    linkCount: parsed.linkCount,
    sectionCount: parsed.sectionCount,
    score,
    issues,
    recommendations,
    llmsTxtRaw: llmsTxt,
    llmsFullTxtRaw: llmsFullTxt,
    llmsTxtSize: llmsTxt ? new TextEncoder().encode(llmsTxt).length : 0,
    llmsFullTxtSize: llmsFullTxt ? new TextEncoder().encode(llmsFullTxt).length : 0,
  };
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { domain, projectId } = body;

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  if (projectId) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  const result = await fetchLlmsTxtContent(domain);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await admin.from("llms_txt_checks").insert({
    user_id: user.id,
    project_id: projectId || null,
    domain: result.domain,
    llms_exists: result.llmsExists,
    llms_full_exists: result.llmsFullExists,
    title: result.title,
    description: result.description,
    section_count: result.sectionCount,
    link_count: result.linkCount,
    score: result.score,
    results_json: {
      issues: result.issues,
      recommendations: result.recommendations,
      sections: result.sections,
      llmsTxtRaw: result.llmsTxtRaw,
      llmsFullTxtRaw: result.llmsFullTxtRaw,
      llmsTxtSize: result.llmsTxtSize,
      llmsFullTxtSize: result.llmsFullTxtSize,
    },
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const projectId = searchParams.get("projectId") || "";
  const offset = (page - 1) * limit;

  let query = admin
    .from("llms_txt_checks")
    .select("id, domain, llms_exists, llms_full_exists, title, section_count, link_count, score, project_id, created_at", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (projectId && projectId !== "all") {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    query = query.eq("project_id", projectId);
  } else {
    const accessibleIds = await getAccessibleProjectIds(user.id);
    if (accessibleIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project_id.in.(${accessibleIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ checks: data, total: count, page, limit });
}

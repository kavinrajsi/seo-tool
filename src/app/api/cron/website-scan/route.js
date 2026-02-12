import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all projects with a website_url and scan_mode = 'auto' (or null, default to auto)
  const { data: projects, error: projErr } = await admin
    .from("projects")
    .select("id, website_url, owner_id, scan_mode")
    .not("website_url", "is", null)
    .neq("website_url", "");

  if (projErr) {
    console.error("[Cron] Failed to fetch projects:", projErr.message);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  // Filter to auto-scan projects (scan_mode is null or 'auto')
  const autoProjects = (projects || []).filter(
    (p) => !p.scan_mode || p.scan_mode === "auto"
  );

  if (autoProjects.length === 0) {
    return NextResponse.json({ message: "No projects to scan", scanned: 0 });
  }

  const results = [];

  for (const project of autoProjects) {
    try {
      // Step 1: Fetch sitemap URLs
      const sitemapRes = await fetch(new URL("/api/sitemap-urls", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: project.website_url }),
      });

      if (!sitemapRes.ok) {
        results.push({ projectId: project.id, status: "error", error: "Sitemap fetch failed" });
        continue;
      }

      const { urls } = await sitemapRes.json();

      if (!urls || urls.length === 0) {
        results.push({ projectId: project.id, status: "error", error: "No URLs found" });
        continue;
      }

      let scannedCount = 0;

      // Step 2: Analyze each URL and save report
      for (const url of urls) {
        try {
          const analyzeRes = await fetch(new URL("/api/analyze", request.url), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });

          if (!analyzeRes.ok) continue;

          const analyzeData = await analyzeRes.json();

          // Save report
          const { error: saveErr } = await admin.from("reports").insert({
            user_id: project.owner_id,
            url: analyzeData.url,
            results: analyzeData.results,
            load_time_ms: analyzeData.loadTimeMs,
            content_length: analyzeData.contentLength,
            project_id: project.id,
          });

          if (!saveErr) scannedCount++;
        } catch {
          // Skip failed URLs
        }
      }

      // Update last_scanned_at on the project
      await admin
        .from("projects")
        .update({ last_scanned_at: new Date().toISOString() })
        .eq("id", project.id);

      results.push({ projectId: project.id, status: "ok", urls: urls.length, scanned: scannedCount });
    } catch (err) {
      results.push({ projectId: project.id, status: "error", error: err.message });
    }
  }

  return NextResponse.json({
    message: "Cron scan completed",
    total: autoProjects.length,
    results,
  });
}

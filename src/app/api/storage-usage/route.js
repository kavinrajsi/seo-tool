import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = { supabase: null, vercel: null };

    // ── Supabase Storage ──
    try {
      // List all buckets
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();

      const bucketDetails = [];
      let totalFiles = 0;
      let totalSize = 0;

      if (buckets) {
        for (const bucket of buckets) {
          // List files in each bucket (top-level, limited)
          const { data: files } = await supabaseAdmin.storage.from(bucket.name).list("", { limit: 1000 });
          const fileCount = files?.length || 0;
          totalFiles += fileCount;

          bucketDetails.push({
            name: bucket.name,
            public: bucket.public,
            fileCount,
            createdAt: bucket.created_at,
          });
        }
      }

      // Get database size via SQL
      let dbSize = null;
      try {
        const { data: sizeData } = await supabaseAdmin.rpc("pg_database_size_pretty", {}).catch(() => ({ data: null }));
        // Fallback: query pg_database_size directly
        if (!sizeData) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`, {
            method: "POST",
            headers: {
              "apikey": process.env.SUPABASE_SECRET_KEY,
              "Authorization": `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }).catch(() => null);
        }
      } catch {}

      // Get table row counts
      const tables = [
        "seo_analyses", "ga_reports", "speed_reports", "crawl_reports",
        "basecamp_events", "basecamp_config", "basecamp_people",
        "devices", "device_vendors", "employees", "candidates",
        "ai_conversations", "ai_api_keys", "google_tokens",
      ];

      const tableCounts = [];
      for (const table of tables) {
        try {
          const { count } = await supabaseAdmin
            .from(table)
            .select("id", { count: "exact", head: true });
          if (count !== null) {
            tableCounts.push({ table, count });
          }
        } catch {}
      }

      result.supabase = {
        buckets: bucketDetails,
        totalFiles,
        tableCounts: tableCounts.filter((t) => t.count > 0),
        totalRows: tableCounts.reduce((sum, t) => sum + t.count, 0),
      };
    } catch (err) {
      result.supabase = { error: err.message };
    }

    // ── Vercel Usage ──
    try {
      const teamId = "team_zRE3DJKWcA10eDtVhfvK77Qf";
      const vercelToken = process.env.VERCEL_API_TOKEN || "";

      if (vercelToken) {
        const projRes = await fetch(`https://api.vercel.com/v9/projects/seo-tool?teamId=${teamId}`, {
          headers: { Authorization: `Bearer ${vercelToken}` },
        });

        if (projRes.ok) {
          const projData = await projRes.json();
          result.vercel = {
            name: projData.name,
            framework: projData.framework,
            nodeVersion: projData.nodeVersion,
            updatedAt: projData.updatedAt,
          };
        }
      }
    } catch {}

    return NextResponse.json(result);
  } catch (err) {
    logError("storage-usage", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function GET(req) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Storage buckets ──
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketStats = [];
    let totalFiles = 0;

    if (buckets) {
      for (const bucket of buckets) {
        const { data: files } = await supabaseAdmin.storage
          .from(bucket.name)
          .list("", { limit: 1000 });
        const fileCount = files?.length || 0;
        totalFiles += fileCount;
        bucketStats.push({ name: bucket.name, public: bucket.public, fileCount });
      }
    }

    // ── Database table counts ──
    const tables = [
      "seo_analyses", "ga_reports", "speed_reports", "crawl_reports",
      "basecamp_events", "basecamp_config", "basecamp_people",
      "devices", "device_vendors", "employees", "candidates",
      "ai_conversations", "ai_api_keys", "google_tokens",
      "employee_work_history", "employee_payslips", "roles",
      "employee_roles", "role_page_access",
    ];

    const tableCounts = [];
    let totalRows = 0;

    for (const table of tables) {
      try {
        const { count } = await supabaseAdmin
          .from(table)
          .select("id", { count: "exact", head: true });
        if (count !== null) {
          tableCounts.push({ table, count });
          totalRows += count;
        }
      } catch {}
    }

    // ── Save snapshot ──
    const snapshot = {
      synced_at: new Date().toISOString(),
      buckets: bucketStats,
      total_files: totalFiles,
      table_counts: tableCounts.filter((t) => t.count > 0),
      total_rows: totalRows,
    };

    await supabaseAdmin.from("storage_sync_snapshots").upsert(
      { id: 1, ...snapshot },
      { onConflict: "id" }
    );

    return NextResponse.json({ ok: true, ...snapshot });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

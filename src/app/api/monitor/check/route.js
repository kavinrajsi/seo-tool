import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendAlertEmail } from "@/lib/resend";

export const maxDuration = 60;

// ── GET: cron job — check all monitored URLs ────────────────────────────
export async function GET(req) {
  // Verify cron secret in production
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all monitored URLs
    const { data: urls } = await supabase
      .from("monitored_urls")
      .select("*")
      .eq("active", true);

    if (!urls || urls.length === 0) {
      return NextResponse.json({ checked: 0 });
    }

    let alertsSent = 0;

    for (const monitor of urls) {
      try {
        // Run analysis
        const origin = new URL(req.url).origin;
        const res = await fetch(`${origin}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: monitor.url }),
        });

        if (!res.ok) continue;
        const analysis = await res.json();
        const newScore = analysis.score;

        // Store history
        await supabase.from("monitoring_history").insert({
          monitor_id: monitor.id,
          user_id: monitor.user_id,
          score: newScore,
          data: { score: newScore, checks_passed: analysis.checks?.filter((c) => c.status === "pass").length || 0, total_checks: analysis.checks?.length || 0 },
        });

        // Check for score drop
        const threshold = monitor.alert_threshold || 10;
        const lastScore = monitor.last_score;

        if (lastScore !== null && lastScore - newScore >= threshold) {
          // Score dropped — send alert
          const { data: { user } } = await supabase.auth.admin
            ? await supabase.auth.admin.getUserById(monitor.user_id)
            : { data: { user: null } };

          const email = monitor.alert_email || user?.email;
          if (email) {
            try {
              await sendAlertEmail({
                to: email,
                subject: `SEO Alert: ${monitor.url} score dropped from ${lastScore} to ${newScore}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
                    <h2 style="font-size: 20px; font-weight: 600; color: #f44336;">SEO Score Drop Alert</h2>
                    <p style="color: #555; line-height: 1.6;">
                      The SEO score for <strong>${monitor.url}</strong> has dropped by <strong>${lastScore - newScore} points</strong>.
                    </p>
                    <div style="display: flex; gap: 24px; margin: 20px 0;">
                      <div style="text-align: center;">
                        <div style="font-size: 32px; font-weight: 700; color: #888;">${lastScore}</div>
                        <div style="font-size: 12px; color: #999;">Previous</div>
                      </div>
                      <div style="text-align: center; font-size: 24px; color: #999; padding-top: 8px;">→</div>
                      <div style="text-align: center;">
                        <div style="font-size: 32px; font-weight: 700; color: #f44336;">${newScore}</div>
                        <div style="font-size: 12px; color: #999;">Current</div>
                      </div>
                    </div>
                    <p style="color: #888; font-size: 13px;">You're receiving this because monitoring is enabled for this URL.</p>
                  </div>
                `,
              });

              await supabase.from("alert_history").insert({
                monitor_id: monitor.id,
                user_id: monitor.user_id,
                type: "score_drop",
                message: `Score dropped from ${lastScore} to ${newScore}`,
              });

              alertsSent++;
            } catch {
              // Email failed — continue
            }
          }
        }

        // Update last_score
        await supabase
          .from("monitored_urls")
          .update({ last_score: newScore, last_checked: new Date().toISOString() })
          .eq("id", monitor.id);
      } catch {
        // Skip failed URL
      }
    }

    return NextResponse.json({ checked: urls.length, alerts: alertsSent });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: manual check of a single URL ──────────────────────────────────
export async function POST(req) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { monitorId } = await req.json();
    if (!monitorId) return NextResponse.json({ error: "monitorId required" }, { status: 400 });

    const { data: monitor } = await supabase
      .from("monitored_urls")
      .select("*")
      .eq("id", monitorId)
      .eq("user_id", user.id)
      .single();

    if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Run analysis
    const origin = new URL(req.url).origin;
    const res = await fetch(`${origin}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: monitor.url }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error || "Analysis failed" }, { status: 500 });
    }

    const analysis = await res.json();

    // Store history
    await supabase.from("monitoring_history").insert({
      monitor_id: monitor.id,
      user_id: user.id,
      score: analysis.score,
      data: { score: analysis.score, checks_passed: analysis.checks?.filter((c) => c.status === "pass").length || 0, total_checks: analysis.checks?.length || 0 },
    });

    // Update last_score
    await supabase
      .from("monitored_urls")
      .update({ last_score: analysis.score, last_checked: new Date().toISOString() })
      .eq("id", monitor.id);

    return NextResponse.json({ score: analysis.score });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

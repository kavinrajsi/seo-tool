import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getUserFromRequest } from "@/lib/auth-helper";
import { getAuthenticatedClient } from "@/lib/google";

export const maxDuration = 30;

// ── GET: fetch fresh ranking data for all tracked keywords ──────────────
export async function GET(req) {
  try {
    const authResult = await getUserFromRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, supabase } = authResult;

    const { searchParams } = new URL(req.url);
    const siteUrl = searchParams.get("siteUrl");
    const days = Number(searchParams.get("days") || "30");
    const teamId = searchParams.get("teamId") || null;

    if (!siteUrl) {
      return NextResponse.json({ error: "siteUrl is required" }, { status: 400 });
    }

    // Get tracked keywords (distinct keyword values for this user/team + site)
    let kwQuery = supabase
      .from("keyword_rankings")
      .select("keyword")
      .eq("url", siteUrl);

    if (teamId) {
      kwQuery = kwQuery.eq("team_id", teamId);
    } else {
      kwQuery = kwQuery.eq("user_id", user.id).is("team_id", null);
    }

    const { data: existing } = await kwQuery;

    const keywords = [...new Set((existing || []).map((r) => r.keyword))];
    if (keywords.length === 0) {
      return NextResponse.json({ keywords: [], rankings: [] });
    }

    // Fetch from Search Console
    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Google not connected" }, { status: 403 });
    }

    const origin = new URL(req.url).origin;
    const auth = getAuthenticatedClient(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: tokenRow.expiry_date,
      },
      `${origin}/api/google/callback`
    );

    const searchConsole = google.searchconsole({ version: "v1", auth });
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    // Query each keyword individually for daily data
    const rankings = [];
    for (const keyword of keywords) {
      const res = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ["date"],
          dimensionFilterGroups: [
            {
              filters: [
                { dimension: "query", expression: keyword, operator: "equals" },
              ],
            },
          ],
        },
      });

      const rows = (res.data.rows || []).map((r) => ({
        keyword,
        date: r.keys[0],
        position: Number(r.position.toFixed(1)),
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: Number((r.ctr * 100).toFixed(2)),
      }));

      rankings.push(...rows);
    }

    // Store today's data points in Supabase
    const today = new Date().toISOString().split("T")[0];
    const todayRows = rankings.filter((r) => r.date === today || r.date === end);
    if (todayRows.length > 0) {
      const inserts = todayRows.map((r) => ({
        user_id: user.id,
        team_id: teamId || null,
        keyword: r.keyword,
        url: siteUrl,
        position: r.position,
        impressions: r.impressions,
        clicks: r.clicks,
        date: r.date,
      }));

      // Upsert: avoid duplicates for same user+keyword+url+date
      for (const row of inserts) {
        const { data: existingRow } = await supabase
          .from("keyword_rankings")
          .select("id")
          .eq("user_id", row.user_id)
          .eq("keyword", row.keyword)
          .eq("url", row.url)
          .eq("date", row.date)
          .single();

        if (existingRow) {
          await supabase
            .from("keyword_rankings")
            .update({ position: row.position, impressions: row.impressions, clicks: row.clicks })
            .eq("id", existingRow.id);
        } else {
          await supabase.from("keyword_rankings").insert(row);
        }
      }
    }

    return NextResponse.json({ keywords, rankings });
  } catch (err) {
    console.error("Keyword track GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch rankings" }, { status: 500 });
  }
}

// ── POST: add a new keyword to track ────────────────────────────────────
export async function POST(req) {
  try {
    const authResult = await getUserFromRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, supabase } = authResult;

    const { keyword, siteUrl, teamId } = await req.json();
    if (!keyword || !siteUrl) {
      return NextResponse.json({ error: "keyword and siteUrl are required" }, { status: 400 });
    }

    // Check if already tracked
    let checkQuery = supabase
      .from("keyword_rankings")
      .select("id")
      .eq("keyword", keyword.toLowerCase().trim())
      .eq("url", siteUrl)
      .limit(1);

    if (teamId) {
      checkQuery = checkQuery.eq("team_id", teamId);
    } else {
      checkQuery = checkQuery.eq("user_id", user.id).is("team_id", null);
    }

    const { data: existing } = await checkQuery;

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Keyword already tracked" }, { status: 409 });
    }

    // Fetch initial data from Search Console
    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Google not connected" }, { status: 403 });
    }

    const origin = new URL(req.url).origin;
    const auth = getAuthenticatedClient(
      {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expiry_date: tokenRow.expiry_date,
      },
      `${origin}/api/google/callback`
    );

    const searchConsole = google.searchconsole({ version: "v1", auth });
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    const res = await searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ["date"],
        dimensionFilterGroups: [
          {
            filters: [
              { dimension: "query", expression: keyword.toLowerCase().trim(), operator: "equals" },
            ],
          },
        ],
      },
    });

    const rows = (res.data.rows || []).map((r) => ({
      user_id: user.id,
      team_id: teamId || null,
      keyword: keyword.toLowerCase().trim(),
      url: siteUrl,
      date: r.keys[0],
      position: Number(r.position.toFixed(1)),
      impressions: r.impressions,
      clicks: r.clicks,
    }));

    // If no Search Console data yet, insert a placeholder row so the keyword is tracked
    if (rows.length === 0) {
      rows.push({
        user_id: user.id,
        team_id: teamId || null,
        keyword: keyword.toLowerCase().trim(),
        url: siteUrl,
        date: end,
        position: 0,
        impressions: 0,
        clicks: 0,
      });
    }

    const { error: insertError } = await supabase
      .from("keyword_rankings")
      .insert(rows);

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to save keyword" }, { status: 500 });
    }

    return NextResponse.json({ success: true, dataPoints: rows.length });
  } catch (err) {
    console.error("Keyword track POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to add keyword" }, { status: 500 });
  }
}

// ── DELETE: remove a tracked keyword ────────────────────────────────────
export async function DELETE(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, supabase } = auth;

    const { keyword, siteUrl, teamId } = await req.json();
    if (!keyword || !siteUrl) {
      return NextResponse.json({ error: "keyword and siteUrl are required" }, { status: 400 });
    }

    let delQuery = supabase
      .from("keyword_rankings")
      .delete()
      .eq("keyword", keyword)
      .eq("url", siteUrl);

    if (teamId) {
      delQuery = delQuery.eq("team_id", teamId);
    } else {
      delQuery = delQuery.eq("user_id", user.id).is("team_id", null);
    }

    const { error } = await delQuery;

    if (error) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Keyword track DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete keyword" }, { status: 500 });
  }
}

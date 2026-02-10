import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SALES_EVENTS } from "@/lib/calendarData";

function pad(n) {
  return String(n).padStart(2, "0");
}

function toICSDate(dateStr) {
  // dateStr is "YYYY-MM-DD", return "YYYYMMDD" for all-day VALUE=DATE
  return dateStr.replace(/-/g, "");
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeICS(str) {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function generateUID(prefix, index) {
  return `${prefix}-${index}@seo-tool-calendar`;
}

function buildSalesEvents(year) {
  const events = [];

  for (let i = 0; i < SALES_EVENTS.length; i++) {
    const se = SALES_EVENTS[i];
    for (let r = 0; r < se.ranges.length; r++) {
      const [sm, sd, em, ed] = se.ranges[r];
      const startDate = `${year}-${pad(sm)}-${pad(sd)}`;
      // ICS all-day DTEND is exclusive (add 1 day)
      const endDate = addDays(`${year}-${pad(em)}-${pad(ed)}`, 1);

      let description = se.description || "";
      if (se.tips && se.tips.length) {
        description += "\\n\\nTips:\\n" + se.tips.map((t) => "- " + t).join("\\n");
      }

      events.push(
        "BEGIN:VEVENT",
        `UID:${generateUID("sales-" + i + "-" + r, year)}`,
        `DTSTART;VALUE=DATE:${toICSDate(startDate)}`,
        `DTEND;VALUE=DATE:${toICSDate(endDate)}`,
        `SUMMARY:${escapeICS(se.name)}`,
        `DESCRIPTION:${escapeICS(description)}`,
        "STATUS:CONFIRMED",
        "TRANSP:TRANSPARENT",
        "END:VEVENT"
      );
    }
  }

  return events;
}

function buildCustomEvents(dbEvents) {
  const events = [];

  for (const ev of dbEvents) {
    const startDate = ev.start_date;
    const endDate = addDays(ev.end_date || ev.start_date, 1);

    let description = ev.description || "";
    if (ev.tips && ev.tips.length) {
      description += "\\n\\nTips:\\n" + ev.tips.map((t) => "- " + t).join("\\n");
    }

    events.push(
      "BEGIN:VEVENT",
      `UID:custom-${ev.id}@seo-tool-calendar`,
      `DTSTART;VALUE=DATE:${toICSDate(startDate)}`,
      `DTEND;VALUE=DATE:${toICSDate(endDate)}`,
      `SUMMARY:${escapeICS(ev.title)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }

  return events;
}

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const calendarType = searchParams.get("calendar_type");
  const year = parseInt(searchParams.get("year"), 10) || new Date().getFullYear();
  const includeSales = searchParams.get("include_sales") !== "false";

  if (!calendarType || !["content", "ecommerce"].includes(calendarType)) {
    return NextResponse.json({ error: "calendar_type must be 'content' or 'ecommerce'" }, { status: 400 });
  }

  // Fetch all custom events for this user/calendar_type in the given year
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const admin = createAdminClient();
  const { data: dbEvents, error } = await admin
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    .eq("calendar_type", calendarType)
    .lte("start_date", yearEnd)
    .gte("end_date", yearStart)
    .order("start_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build ICS content
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SEO Tool//Calendar Export//EN",
    `X-WR-CALNAME:${calendarType === "content" ? "Content" : "eCommerce"} Calendar ${year}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  if (includeSales) {
    lines.push(...buildSalesEvents(year));
  }

  lines.push(...buildCustomEvents(dbEvents || []));
  lines.push("END:VCALENDAR");

  const icsContent = lines.join("\r\n");
  const filename = `${calendarType}-calendar-${year}.ics`;

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

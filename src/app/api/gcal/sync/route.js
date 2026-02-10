import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidToken } from "../_lib/refreshToken";
import { SALES_EVENTS } from "@/lib/calendarData";

function pad(n) {
  return String(n).padStart(2, "0");
}

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

async function pushEvents(accessToken, calendarId, dbEvents, admin) {
  let pushed = 0;
  const errors = [];

  for (const ev of dbEvents) {
    const endDate = new Date(ev.end_date || ev.start_date);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

    const body = {
      summary: ev.title,
      description: ev.description || "",
      start: { date: ev.start_date },
      end: { date: endStr },
    };

    try {
      if (ev.gcal_event_id) {
        // Update existing
        const res = await fetch(
          `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${ev.gcal_event_id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        if (res.ok) {
          pushed++;
        } else {
          const err = await res.text();
          errors.push(`Update ${ev.title}: ${err}`);
        }
      } else {
        // Create new
        const res = await fetch(
          `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        if (res.ok) {
          const created = await res.json();
          // Store gcal_event_id back in DB
          await admin
            .from("calendar_events")
            .update({ gcal_event_id: created.id })
            .eq("id", ev.id);
          pushed++;
        } else {
          const err = await res.text();
          errors.push(`Create ${ev.title}: ${err}`);
        }
      }
    } catch (e) {
      errors.push(`${ev.title}: ${e.message}`);
    }
  }

  return { pushed, errors };
}

async function pullEvents(accessToken, calendarId, userId, calendarType, year, admin) {
  let pulled = 0;
  const errors = [];

  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;

  try {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      maxResults: "500",
      orderBy: "startTime",
    });

    const res = await fetch(
      `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      errors.push(`List events: ${err}`);
      return { pulled, errors };
    }

    const data = await res.json();
    const gcalEvents = data.items || [];

    // Get existing events with gcal_event_ids for dedup
    const { data: existing } = await admin
      .from("calendar_events")
      .select("id, gcal_event_id")
      .eq("user_id", userId)
      .eq("calendar_type", calendarType)
      .not("gcal_event_id", "is", null);

    const existingGcalIds = new Set((existing || []).map((e) => e.gcal_event_id));

    // Also build a set of sales event names to avoid pulling those back in
    const salesNames = new Set(SALES_EVENTS.map((s) => s.name));

    for (const gcalEv of gcalEvents) {
      // Skip events we already have or that match sales event names
      if (existingGcalIds.has(gcalEv.id)) continue;
      if (salesNames.has(gcalEv.summary)) continue;

      // Only import all-day events (those with date, not dateTime)
      const startDate = gcalEv.start?.date;
      if (!startDate) continue;

      // Compute end_date (subtract 1 day since ICS/GCAL end is exclusive for all-day)
      let endDate = startDate;
      if (gcalEv.end?.date) {
        const ed = new Date(gcalEv.end.date);
        ed.setDate(ed.getDate() - 1);
        endDate = `${ed.getFullYear()}-${pad(ed.getMonth() + 1)}-${pad(ed.getDate())}`;
      }

      const { error: insertErr } = await admin
        .from("calendar_events")
        .insert({
          user_id: userId,
          calendar_type: calendarType,
          event_type: "event",
          title: gcalEv.summary || "Untitled",
          description: gcalEv.description || null,
          start_date: startDate,
          end_date: endDate,
          gcal_event_id: gcalEv.id,
        });

      if (insertErr) {
        errors.push(`Import "${gcalEv.summary}": ${insertErr.message}`);
      } else {
        pulled++;
      }
    }
  } catch (e) {
    errors.push(`Pull: ${e.message}`);
  }

  return { pulled, errors };
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { calendar_type, direction = "push", year } = body;
  const syncYear = year || new Date().getFullYear();

  if (!calendar_type || !["content", "ecommerce"].includes(calendar_type)) {
    return NextResponse.json({ error: "calendar_type must be 'content' or 'ecommerce'" }, { status: 400 });
  }

  if (!["push", "pull", "both"].includes(direction)) {
    return NextResponse.json({ error: "direction must be 'push', 'pull', or 'both'" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get connection
  const { data: connection } = await admin
    .from("gcal_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
  }

  const accessToken = await getValidToken(connection);
  if (!accessToken) {
    return NextResponse.json({ error: "Failed to refresh Google token. Please reconnect." }, { status: 401 });
  }

  const calendarId = connection.calendar_id || "primary";
  let totalPushed = 0;
  let totalPulled = 0;
  const allErrors = [];

  if (direction === "push" || direction === "both") {
    // Get all custom events for this calendar type and year
    const yearStart = `${syncYear}-01-01`;
    const yearEnd = `${syncYear}-12-31`;

    const { data: dbEvents } = await admin
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("calendar_type", calendar_type)
      .lte("start_date", yearEnd)
      .gte("end_date", yearStart)
      .order("start_date", { ascending: true });

    if (dbEvents && dbEvents.length) {
      const { pushed, errors } = await pushEvents(accessToken, calendarId, dbEvents, admin);
      totalPushed = pushed;
      allErrors.push(...errors);
    }
  }

  if (direction === "pull" || direction === "both") {
    const { pulled, errors } = await pullEvents(accessToken, calendarId, user.id, calendar_type, syncYear, admin);
    totalPulled = pulled;
    allErrors.push(...errors);
  }

  // Update last_synced_at
  await admin
    .from("gcal_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({
    synced: true,
    pushed: totalPushed,
    pulled: totalPulled,
    errors: allErrors,
  });
}

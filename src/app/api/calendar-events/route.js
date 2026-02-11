import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getUserProjectRole, getAccessibleProjectIds } from "@/lib/projectAccess";
import { canEditProjectData } from "@/lib/permissions";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const calendarType = searchParams.get("calendar_type");
  const year = parseInt(searchParams.get("year"), 10);
  const month = parseInt(searchParams.get("month"), 10);
  const projectId = searchParams.get("projectId") || "";

  if (!calendarType || !["content", "ecommerce"].includes(calendarType)) {
    return NextResponse.json({ error: "calendar_type must be 'content' or 'ecommerce'" }, { status: 400 });
  }

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Valid year and month (1-12) are required" }, { status: 400 });
  }

  // Compute first and last day of the month
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let query = admin
    .from("calendar_events")
    .select("*")
    .eq("calendar_type", calendarType)
    .lte("start_date", lastDayStr)
    .gte("end_date", firstDay)
    .order("start_date", { ascending: true });

  if (projectId === "all") {
    const accessibleIds = await getAccessibleProjectIds(user.id);
    if (accessibleIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},project_id.in.(${accessibleIds.join(",")})`);
    } else {
      query = query.eq("user_id", user.id);
    }
  } else if (projectId && projectId !== "personal") {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    query = query.eq("project_id", projectId);
  } else {
    query = query.eq("user_id", user.id).is("project_id", null);
  }

  const { data: events, error } = await query;

  if (error) {
    console.error("[Calendar Events API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: events || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

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

  const { calendar_type, event_type, title, description, tips, start_date, end_date, color, projectId } = body;

  if (!calendar_type || !["content", "ecommerce"].includes(calendar_type)) {
    return NextResponse.json({ error: "calendar_type must be 'content' or 'ecommerce'" }, { status: 400 });
  }

  if (!event_type || !["event", "note"].includes(event_type)) {
    return NextResponse.json({ error: "event_type must be 'event' or 'note'" }, { status: 400 });
  }

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!start_date) {
    return NextResponse.json({ error: "start_date is required" }, { status: 400 });
  }

  // Verify project access if projectId provided
  if (projectId) {
    const projectRole = await getUserProjectRole(user.id, projectId);
    if (!projectRole || !canEditProjectData(projectRole)) {
      return NextResponse.json({ error: "Insufficient project permissions" }, { status: 403 });
    }
  }

  const insertData = {
    user_id: user.id,
    project_id: projectId || null,
    calendar_type,
    event_type,
    title: title.trim(),
    description: description?.trim() || null,
    tips: Array.isArray(tips) ? tips.filter(Boolean) : null,
    start_date,
    end_date: end_date || start_date,
    color: color || null,
  };

  const { data: event, error } = await admin
    .from("calendar_events")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[Calendar Events API] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event }, { status: 201 });
}

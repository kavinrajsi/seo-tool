import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  let deviceQuery = admin
    .from("devices")
    .select("id")
    .eq("user_id", user.id);

  if (projectId) {
    deviceQuery = deviceQuery.eq("project_id", projectId);
  } else {
    deviceQuery = deviceQuery.is("project_id", null);
  }

  const { data: devices, error: devError } = await deviceQuery;

  if (devError) {
    console.error("[Device Issues API] Device query error:", devError.message);
    return NextResponse.json({ error: devError.message }, { status: 500 });
  }

  const deviceIds = (devices || []).map((d) => d.id);

  if (deviceIds.length === 0) {
    return NextResponse.json({ issues: [] });
  }

  const { data: issues, error } = await admin
    .from("device_issues")
    .select("*, reporter:employees!device_issues_reported_by_fkey(id, first_name, last_name), device:devices!device_issues_device_id_fkey(id, brand, model)")
    .in("device_id", deviceIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Device Issues API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ issues: issues || [] });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  const admin = createAdminClient();

  let connQuery = admin
    .from("instagram_connections")
    .select("id")
    .eq("user_id", user.id);
  if (projectId) {
    connQuery = connQuery.eq("project_id", projectId);
  } else {
    connQuery = connQuery.is("project_id", null);
  }
  const { data: connection } = await connQuery.maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "No Instagram connection found" }, { status: 404 });
  }

  // Delete related data first, then the connection
  await admin.from("instagram_insights").delete().eq("user_id", user.id);
  await admin.from("instagram_posts").delete().eq("user_id", user.id);

  let delQuery = admin
    .from("instagram_connections")
    .delete()
    .eq("user_id", user.id);
  if (projectId) {
    delQuery = delQuery.eq("project_id", projectId);
  } else {
    delQuery = delQuery.is("project_id", null);
  }
  const { error: dbError } = await delQuery;

  if (dbError) {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

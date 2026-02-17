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

  // Get the current connection
  let connQuery = admin
    .from("shopify_connections")
    .select("shop_domain, access_token")
    .eq("user_id", user.id);
  if (projectId) {
    connQuery = connQuery.eq("project_id", projectId);
  } else {
    connQuery = connQuery.is("project_id", null);
  }
  const { data: connection } = await connQuery.maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "No Shopify connection found" }, { status: 404 });
  }

  // Revoke the access token at Shopify (best-effort)
  try {
    await fetch(
      `https://${connection.shop_domain}/admin/api/2024-01/access_tokens/current.json`,
      {
        method: "DELETE",
        headers: {
          "X-Shopify-Access-Token": connection.access_token,
        },
      }
    );
  } catch {
    // Non-critical — continue with deletion even if revoke fails
  }

  // Delete the connection
  let delQuery = admin
    .from("shopify_connections")
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

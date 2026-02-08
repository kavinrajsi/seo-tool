import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("shop_domain, store_name, webhooks_enabled, connected_at, last_synced_at")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    shopDomain: connection.shop_domain,
    storeName: connection.store_name,
    webhooksEnabled: connection.webhooks_enabled,
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at,
  });
}

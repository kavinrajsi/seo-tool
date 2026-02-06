import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const [productsRes, ordersRes, collectionsRes, tagsRes] = await Promise.all([
      admin.from("ecommerce_products").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("ecommerce_orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("ecommerce_collections").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("ecommerce_tags").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    return NextResponse.json({
      products: productsRes.count || 0,
      orders: ordersRes.count || 0,
      collections: collectionsRes.count || 0,
      tags: tagsRes.count || 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({
      products: 0,
      orders: 0,
      collections: 0,
      tags: 0,
    });
  }
}

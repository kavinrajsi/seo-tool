import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: existing } = await admin
    .from("device_catalog")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowedFields = ["brand", "model", "device_type", "price", "currency", "notes", "vendor_name", "ram", "hard_disk_size", "processor", "year_of_manufacturing", "graphics"];
  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "price" || field === "year_of_manufacturing") {
        updates[field] = body[field] === "" || body[field] === null ? null : Number(body[field]);
      } else if (typeof body[field] === "string") {
        updates[field] = body[field].trim() || null;
      } else {
        updates[field] = body[field];
      }
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data: item, error } = await admin
    .from("device_catalog")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Device Catalog API] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await admin
    .from("device_catalog")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[Device Catalog API] Delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

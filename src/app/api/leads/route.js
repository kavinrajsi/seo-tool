import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request) {
  const admin = createAdminClient();

  const body = await request.json();
  const { fullName, email } = body;

  if (!fullName || !email) {
    return NextResponse.json(
      { error: "Full name and email are required" },
      { status: 400 }
    );
  }

  // Upsert: if email already exists, update the name
  const { data, error } = await admin
    .from("leads")
    .upsert(
      { full_name: fullName, email: email.toLowerCase().trim() },
      { onConflict: "email" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request) {
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("leads")
    .select("full_name, email")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, fullName: data.full_name, email: data.email });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();

    const required = [
      "first_name", "last_name", "gender", "date_of_birth",
      "work_email", "personal_email", "mobile_number", "mobile_number_secondary",
      "date_of_joining", "personal_address_line_1", "personal_city",
      "personal_state", "personal_postal_code", "pan_number", "aadhaar_number",
      "blood_type", "shirt_size",
    ];

    for (const field of required) {
      if (!body[field]?.trim()) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const row = {
      first_name: body.first_name.trim(),
      middle_name: body.middle_name?.trim() || null,
      last_name: body.last_name.trim(),
      gender: body.gender,
      date_of_birth: body.date_of_birth,
      work_email: body.work_email.trim().toLowerCase(),
      personal_email: body.personal_email.trim().toLowerCase(),
      mobile_number: body.mobile_number.trim(),
      mobile_number_secondary: body.mobile_number_secondary.trim(),
      employee_number: body.employee_number?.trim() || null,
      date_of_joining: body.date_of_joining,
      designation: null,
      department: body.department?.trim() || null,
      personal_address_line_1: body.personal_address_line_1.trim(),
      personal_address_line_2: body.personal_address_line_2?.trim() || null,
      personal_city: body.personal_city.trim(),
      personal_state: body.personal_state.trim(),
      personal_postal_code: body.personal_postal_code.trim(),
      pan_number: body.pan_number.trim().toUpperCase(),
      aadhaar_number: body.aadhaar_number.trim(),
      pan_card_url: body.pan_card_url || null,
      aadhaar_card_url: body.aadhaar_card_url || null,
      blood_type: body.blood_type,
      shirt_size: body.shirt_size,
      role: "user",
      employee_status: "active",
    };

    const { error } = await supabase.from("employees").insert(row);

    if (error) {
      if (error.message?.includes("employees_work_email_key")) {
        return NextResponse.json({ error: "This email is already registered.", field: "work_email" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, name: `${row.first_name} ${row.last_name}` });
  } catch (err) {
    logError("employees/register", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

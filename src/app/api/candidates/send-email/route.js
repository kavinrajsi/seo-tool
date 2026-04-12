import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { sendAlertEmail } from "@/lib/email";

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase } = auth;

  const { candidate_id, to_email, candidate_name, subject, body } = await req.json();
  if (!to_email || !subject || !body) {
    return NextResponse.json({ error: "to_email, subject, body required" }, { status: 400 });
  }

  // Replace placeholders
  const finalSubject = subject.replace(/{{name}}/gi, candidate_name || "");
  const finalBody = body
    .replace(/{{name}}/gi, candidate_name || "")
    .replace(/\n/g, "<br>");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
      <div style="color: #333; line-height: 1.7; font-size: 15px;">
        ${finalBody}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Sent from Madarth HR</p>
    </div>
  `;

  try {
    await sendAlertEmail({ to: to_email, subject: finalSubject, html });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

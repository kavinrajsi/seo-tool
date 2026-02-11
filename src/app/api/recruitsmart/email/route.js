import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const TEMPLATES = {
  interview_invite: {
    subject: "Interview Invitation — {{position}} at Our Agency",
    body: `Dear {{first_name}},

Thank you for your interest in the {{position}} role ({{job_role}}) at our agency.

We are pleased to invite you for an interview to discuss this opportunity further. Please let us know your availability over the next few days so we can schedule a convenient time.

We look forward to speaking with you.

Best regards,
The Hiring Team`,
  },
  offer_letter: {
    subject: "Offer Letter — {{position}}",
    body: `Dear {{first_name}},

Congratulations! We are delighted to extend an offer for the position of {{position}} ({{job_role}}) at our agency.

We were impressed with your profile and believe you will be a valuable addition to our team. Please find the details of the offer below and let us know if you have any questions.

Next Steps:
- Review the offer details
- Confirm your acceptance at your earliest convenience
- We will share onboarding information upon acceptance

Welcome aboard!

Best regards,
The Hiring Team`,
  },
  rejection: {
    subject: "Application Update — {{position}}",
    body: `Dear {{first_name}},

Thank you for taking the time to apply for the {{position}} position at our agency.

After careful consideration, we have decided to move forward with other candidates at this time. This was a difficult decision, and we genuinely appreciate your interest in joining our team.

We encourage you to apply for future openings that match your skills and experience. We wish you all the best in your career journey.

Kind regards,
The Hiring Team`,
  },
  custom: {
    subject: "",
    body: "",
  },
};

function replacePlaceholders(text, candidate) {
  if (!text) return text;
  return text
    .replace(/\{\{first_name\}\}/g, candidate.first_name || "")
    .replace(/\{\{last_name\}\}/g, candidate.last_name || "")
    .replace(/\{\{position\}\}/g, candidate.position || "the position")
    .replace(/\{\{job_role\}\}/g, candidate.job_role || "the role")
    .replace(/\{\{email\}\}/g, candidate.email || "")
    .replace(/\{\{candidate_id\}\}/g, candidate.candidate_id || "")
    .replace(/\{\{job_id\}\}/g, candidate.job_id || "")
    .replace(/\{\{location\}\}/g, candidate.location || "");
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

  const { candidateId, templateType, subject, body: emailBody } = body;

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
  }

  if (!templateType || !TEMPLATES[templateType]) {
    return NextResponse.json({ error: "Invalid templateType. Must be one of: interview_invite, offer_letter, rejection, custom" }, { status: 400 });
  }

  const { data: candidate } = await admin
    .from("recruitsmart")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  if (!candidate.email) {
    return NextResponse.json({ error: "Candidate has no email address" }, { status: 400 });
  }

  const token = process.env.ZEPTO_MAIL_TOKEN;
  const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL;
  const fromName = process.env.ZEPTO_MAIL_FROM_NAME || "RecruitSmart";

  if (!token || !fromEmail) {
    return NextResponse.json({ error: "Email service not configured. Set ZEPTO_MAIL_TOKEN and ZEPTO_MAIL_FROM_EMAIL." }, { status: 500 });
  }

  const template = TEMPLATES[templateType];
  const finalSubject = replacePlaceholders(subject || template.subject, candidate);
  const finalBody = replacePlaceholders(emailBody || template.body, candidate);

  try {
    const res = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Zoho-enczapikey ${token}`,
      },
      body: JSON.stringify({
        from: { address: fromEmail, name: fromName },
        to: [{ email_address: { address: candidate.email, name: `${candidate.first_name} ${candidate.last_name}` } }],
        subject: finalSubject,
        textbody: finalBody,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("[RecruitSmart Email] ZeptoMail error:", result);
      return NextResponse.json({ error: result.message || "Failed to send email" }, { status: 500 });
    }

    // Log the email in notes
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Email sent: ${templateType} — "${finalSubject}"`;
    const currentNotes = candidate.notes || "";
    const updatedNotes = currentNotes ? `${currentNotes}\n${logEntry}` : logEntry;

    await admin
      .from("recruitsmart")
      .update({ notes: updatedNotes, updated_at: timestamp })
      .eq("id", candidateId);

    return NextResponse.json({
      success: true,
      messageId: result.request_id || result.data?.[0]?.message_id || null,
    });
  } catch (err) {
    console.error("[RecruitSmart Email] Network error:", err.message);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

import { Resend } from "resend";

let _resend = null;

function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendInvitationEmail({ to, teamName, inviterEmail, role, acceptUrl }) {
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "SEO Tool <noreply@resend.dev>",
    to,
    subject: `You've been invited to join "${teamName}" on SEO Tool`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Team Invitation</h2>
        <p style="color: #555; line-height: 1.6;">
          <strong>${inviterEmail}</strong> has invited you to join
          <strong>${teamName}</strong> as a <strong>${role}</strong>.
        </p>
        <a href="${acceptUrl}"
           style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #171717; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
          Accept Invitation
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">
          This invitation expires in 7 days. If you didn't expect this, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send invitation email:", error);
    throw new Error("Failed to send invitation email");
  }
}

export async function sendAlertEmail({ to, subject, html }) {
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "SEO Tool <noreply@resend.dev>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send alert email:", error);
    throw new Error("Failed to send email");
  }
}

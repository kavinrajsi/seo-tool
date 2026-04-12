import nodemailer from "nodemailer";

let _transport = null;

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transport;
}

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || '"SEO Tool Madarth" <noreply@madarth.com>';

export async function sendInvitationEmail({ to, teamName, inviterEmail, role, acceptUrl }) {
  const transport = getTransport();

  const subject = `You've been invited to join "${teamName}" on SEO Tool`;
  try {
    await transport.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
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
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw new Error("Failed to send invitation email");
  }
}

export async function sendAlertEmail({ to, subject, html }) {
  const transport = getTransport();

  try {
    await transport.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send alert email:", error);
    throw new Error("Failed to send email");
  }
}

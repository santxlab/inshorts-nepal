import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use a verified sender domain in production.
// Free Resend accounts can use onboarding@resend.dev for testing.
const FROM = process.env.RESEND_FROM_EMAIL ?? "Inshorts Nepal <onboarding@resend.dev>";

export async function sendMagicLinkEmail(to: string, magicUrl: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Your Inshorts Nepal sign-in link",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px 32px;max-width:480px;">
        <tr>
          <td>
            <h1 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">Sign in to Inshorts Nepal</h1>
            <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.5;">
              Click the button below to sign in. This link is valid for <strong>15 minutes</strong> and can only be used once.
            </p>
            <a href="${magicUrl}"
               style="display:inline-block;background:#e63946;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
              Sign In →
            </a>
            <p style="margin:28px 0 0;color:#999;font-size:12px;word-break:break-all;">
              Can't click the button? Copy this link:<br>
              <span style="color:#666;">${magicUrl}</span>
            </p>
            <hr style="margin:28px 0;border:none;border-top:1px solid #eee;">
            <p style="margin:0;color:#bbb;font-size:12px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[Resend] Failed to send magic link email:", error);
    throw new Error("Failed to send email");
  }
}

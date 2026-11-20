import "server-only";

import { SUPPORT } from "@/lib/support/contact";

type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };
export type SendResult = { ok: true } | { skipped: true } | { error: string };

/**
 * Sends one email with Resend (https://resend.com). Needs RESEND_API_KEY on the server; without it nothing is sent
 * and the app keeps working. A failed email never stops what the student was doing (payment, message): it is logged only.
 */
export async function sendEmail(mail: Mail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };
  const from = process.env.EMAIL_FROM || `Deutli <${SUPPORT.email}>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text, reply_to: mail.replyTo ?? SUPPORT.email }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("email not sent", res.status);
      return { error: "The email service refused the message." };
    }
    return { ok: true };
  } catch (e) {
    console.error("email not sent", e instanceof Error ? e.message : e);
    return { error: "The email service could not be reached." };
  }
}

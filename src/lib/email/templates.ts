import { longDay } from "@/lib/pro/reminder";
import { SUPPORT } from "@/lib/support/contact";

const APP = "https://app.deutli.com";

/** Anything a student typed must never be able to add its own HTML to an email. */
export const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

type Body = { heading: string; lines: string[]; button?: { label: string; href: string }; small?: string };

/** One simple, readable layout for every email (dark header, white card, one button). Lines are plain text. */
function layout({ heading, lines, button, small }: Body): { html: string; text: string } {
  const html = `<!doctype html><html><body style="margin:0;background:#081028;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1b2340">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b1739;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700">Deutli</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0b1739">${esc(heading)}</h1>
${lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${esc(l)}</p>`).join("\n")}
${button ? `<p style="margin:22px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#7f25fb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${esc(button.label)}</a></p>` : ""}
<p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#5b6478">${esc(small ?? `Questions? Just reply to this email or write to ${SUPPORT.email}.`)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [heading, "", ...lines, ...(button ? ["", `${button.label}: ${button.href}`] : []), "", small ?? `Questions? Just reply to this email or write to ${SUPPORT.email}.`].join("\n");
  return { html, text };
}

const first = (name: string | null) => (name ?? "").trim().split(/\s+/)[0] || "there";

/** To the student: payment confirmed, Pro is on. */
export function proActiveEmail(p: { name: string | null; planName: string; until: string }) {
  const { html, text } = layout({
    heading: "Your Deutli Pro is active",
    lines: [`Hi ${first(p.name)},`, `Thank you! Your payment for ${p.planName} is confirmed, and Deutli Pro is active until ${longDay(p.until)}.`, "You can now open every mock exam, and the new Pro features the day they go live."],
    button: { label: "Open Deutli", href: `${APP}/dashboard/exam` },
  });
  return { subject: "Your Deutli Pro is active", html, text };
}

/** To the student: bank or wallet payment details received, we will check them. */
export function paymentDetailsEmail(p: { name: string | null; planName: string; amount: number; reference: string }) {
  const { html, text } = layout({
    heading: "We received your payment details",
    lines: [`Hi ${first(p.name)},`, `Thank you. We got your transaction ID for ${p.planName} (Rs. ${p.amount.toLocaleString("en-PK")}), order ${p.reference}.`, "We check every bank or wallet payment by hand, usually within one working day. Pro turns on as soon as we confirm it, and we will email you then."],
    button: { label: "See your order", href: `${APP}/dashboard/upgrade` },
  });
  return { subject: `We received your payment details (${p.reference})`, html, text };
}

/** To the Deutli inbox: a bank or wallet payment needs checking. */
export function adminPaymentToCheckEmail(p: { name: string | null; email: string | null; planName: string; amount: number; reference: string; txn: string }) {
  const { html, text } = layout({
    heading: "New payment to check",
    lines: [`${p.name ?? "A student"}${p.email ? ` (${p.email})` : ""} says they paid.`, `Plan: ${p.planName}. Amount: Rs. ${p.amount.toLocaleString("en-PK")}. Reference: ${p.reference}. Transaction ID: ${p.txn}.`, "Look in your bank or wallet for this transaction, then approve it in the admin panel."],
    button: { label: "Open Payments", href: `${APP}/admin/payments` },
    small: "This message goes to the support inbox only.",
  });
  return { subject: `Payment to check: ${p.reference}`, html, text };
}

/** To the Deutli inbox: a student sent a support message. */
export function adminNewFeedbackEmail(p: { kind: string; name: string | null; email: string | null; message: string; page: string | null }) {
  const { html, text } = layout({
    heading: `New ${p.kind} message`,
    lines: [`From ${p.name ?? "a student"}${p.email ? ` (${p.email})` : ""}${p.page ? `, on ${p.page}` : ""}:`, p.message.slice(0, 1500)],
    button: { label: "Open the feedback inbox", href: `${APP}/admin/feedback` },
    small: "Reply to the student by email or WhatsApp, then mark the message Done.",
  });
  return { subject: `Support: new ${p.kind} message`, html, text };
}

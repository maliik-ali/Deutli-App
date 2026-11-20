import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "@/lib/email/send";
import { classReminderEmail, proEndingEmail } from "@/lib/email/templates";
import { classReminderWindow, localHour, proReminderKind } from "@/lib/reminders/rules";
import { cleanTimeZone, todayIn } from "@/lib/time";

type Mail = { subject: string; html: string; text: string };

/**
 * Claims the reminder first (the table has one row per student + reminder), then sends it.
 * Two runs at the same time can never send twice. If the email fails or email is switched off, the claim is
 * removed so the next run tries again.
 */
async function claimAndSend(admin: SupabaseClient, userId: string, kind: string, ref: string, to: string | undefined, mail: Mail) {
  if (!to) return false;
  const { data: claimed } = await admin.from("email_log").upsert({ user_id: userId, kind, ref }, { onConflict: "user_id,kind,ref", ignoreDuplicates: true }).select("user_id");
  if (!claimed?.length) return false; // already sent before
  const result = await sendEmail({ to, ...mail });
  if (!("ok" in result)) {
    await admin.from("email_log").delete().eq("user_id", userId).eq("kind", kind).eq("ref", ref);
    if ("error" in result) console.error("reminder email failed", kind, result.error);
    return false;
  }
  return true;
}

const emailOf = async (admin: SupabaseClient, id: string) => (await admin.auth.admin.getUserById(id)).data.user?.email ?? undefined;

/** Pro ends in 7 days or tomorrow. */
async function proReminders(admin: SupabaseClient, now: Date) {
  const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  // Wide on purpose (time zones differ by a day); the exact check is done per student below.
  const { data: rows } = await admin.from("profiles").select("id, full_name, pro_until, time_zone").eq("role", "student").gte("pro_until", day(-1)).lte("pro_until", day(9));
  let sent = 0;
  for (const p of rows ?? []) {
    const tz = cleanTimeZone(p.time_zone ?? "");
    const due = proReminderKind(p.pro_until, todayIn(tz, now), localHour(tz, now));
    if (!due) continue;
    const mail = proEndingEmail({ name: p.full_name, until: p.pro_until, days: due.days });
    if (await claimAndSend(admin, p.id, due.kind, p.pro_until, await emailOf(admin, p.id), mail)) sent += 1;
  }
  return sent;
}

/** A registered class starts within the hour. */
async function classReminders(admin: SupabaseClient, now: Date) {
  const { from, to } = classReminderWindow(now);
  const { data: classes } = await admin.from("live_classes").select("id, title, starts_at, teacher_id").eq("status", "scheduled").gt("starts_at", from).lte("starts_at", to);
  let sent = 0;
  for (const c of classes ?? []) {
    const { data: teacher } = await admin.from("profiles").select("full_name").eq("id", c.teacher_id).maybeSingle();
    const { data: regs } = await admin.from("class_registrations").select("user_id").eq("class_id", c.id).eq("status", "registered");
    for (const r of regs ?? []) {
      const { data: p } = await admin.from("profiles").select("full_name, time_zone").eq("id", r.user_id).maybeSingle();
      const mail = classReminderEmail({ name: p?.full_name ?? null, title: c.title, teacher: teacher?.full_name ?? null, startsAt: c.starts_at, timeZone: cleanTimeZone(p?.time_zone ?? ""), classId: c.id });
      if (await claimAndSend(admin, r.user_id, "class_1h", c.id, await emailOf(admin, r.user_id), mail)) sent += 1;
    }
  }
  return sent;
}

export async function runReminders(admin: SupabaseClient, now: Date = new Date()) {
  const pro = await proReminders(admin, now);
  const classes = await classReminders(admin, now);
  return { pro, classes };
}

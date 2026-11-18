"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { JOIN_GRACE_MIN, JOIN_OPENS_MIN, LEVEL_IDS, SKILL_IDS, SPECIALTIES } from "@/lib/classes/constants";
import { LANGUAGE_CODES } from "@/lib/languages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { addDays, zonedToUtc } from "@/lib/time";

const STUDENT_SIDE = ["student", "academy_admin", "super_admin"] as const;
const TEACHER_SIDE = ["teacher", "academy_admin", "super_admin"] as const;
const SAVE_ERROR = "We couldn't save this. Check your internet and try again.";
const NO_ADMIN = "Classes are not available right now. Please try again later.";

type Result = { error: string } | { ok: true };

function refresh() {
  revalidatePath("/dashboard/classes", "layout");
  revalidatePath("/teacher/classes", "layout");
  revalidatePath("/admin/classes", "layout");
}

// ---------------------------------------------------------------------------------------------
// Teachers and admins: create, edit and cancel classes
// ---------------------------------------------------------------------------------------------

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);

const classSchema = z.object({
  id: z.uuid().optional(),
  teacherId: z.uuid().optional(),
  courseTitle: z.string().trim().min(2, "Give the course a name.").max(80, "Keep the course name under 80 characters."),
  title: z.string().trim().min(2, "Give the class a title.").max(120, "Keep the title under 120 characters."),
  description: text(300).default(""),
  syllabus: text(3000).default(""),
  skill: z.enum(SKILL_IDS),
  level: z.enum(LEVEL_IDS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
  durationMin: z.number().int().min(15).max(240),
  capacity: z.number().int().min(1, "Seats must be at least 1.").max(500).nullable(),
  joinUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "The join link must start with https://"),
  passcode: text(40).default(""),
  repeatWeeks: z.number().int().min(1).max(12).default(1),
});
export type ClassInput = z.input<typeof classSchema>;

/**
 * Create a class (optionally repeated weekly) or edit one.
 * Times are read in the saver's own time zone. Teachers can only use their own classes;
 * admins pick the teacher.
 */
export async function saveClass(input: unknown): Promise<{ error: string } | { ok: true; id: string }> {
  const user = await requireUser(TEACHER_SIDE);
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const isAdmin = user.role !== "teacher";
  let teacherId = user.id;
  if (isAdmin) {
    if (!v.teacherId) return { error: "Choose the teacher for this class." };
    const admin = createAdminClient();
    if (!admin) return { error: NO_ADMIN };
    const { data: t } = await admin.from("profiles").select("role").eq("id", v.teacherId).maybeSingle();
    if (t?.role !== "teacher") return { error: "That person is not a teacher." };
    teacherId = v.teacherId;
  }

  const supabase = await createClient();
  const fields = {
    course_title: v.courseTitle,
    title: v.title,
    description: v.description || null,
    syllabus: v.syllabus || null,
    skill: v.skill,
    level: v.level,
    duration_min: v.durationMin,
    capacity: v.capacity,
    updated_at: new Date().toISOString(),
  };

  // Edit one class.
  if (v.id) {
    const startsAt = zonedToUtc(v.date, v.time, user.timeZone);
    if (!startsAt) return { error: "Pick a valid date and time." };
    const patch = { ...fields, starts_at: startsAt.toISOString(), ...(isAdmin ? { teacher_id: teacherId } : {}) };
    const { data, error } = await supabase.from("live_classes").update(patch).eq("id", v.id).select("id");
    if (error || !data?.length) return { error: SAVE_ERROR };
    const linked = await saveLink(v.id, v.joinUrl, v.passcode);
    if (linked) return { error: linked };
    refresh();
    return { ok: true, id: v.id };
  }

  // Create (and repeat weekly). The same clock time is kept even when the clocks change.
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < v.repeatWeeks; i++) {
    const startsAt = zonedToUtc(addDays(v.date, i * 7), v.time, user.timeZone);
    if (!startsAt) return { error: "Pick a valid date and time." };
    if (i === 0 && startsAt.getTime() < Date.now() - 5 * 60_000) return { error: "That time is in the past. Pick a later time." };
    rows.push({ ...fields, teacher_id: teacherId, created_by: user.id, starts_at: startsAt.toISOString() });
  }
  const { data, error } = await supabase.from("live_classes").insert(rows).select("id");
  if (error || !data?.length) return { error: SAVE_ERROR };
  for (const row of data) {
    const linked = await saveLink(row.id as string, v.joinUrl, v.passcode);
    if (linked) return { error: linked };
  }
  refresh();
  return { ok: true, id: data[0].id as string };
}

/** Saves (or removes) the join link of a class. Returns an error message or null. */
async function saveLink(classId: string, joinUrl: string, passcode: string): Promise<string | null> {
  const supabase = await createClient();
  if (!joinUrl) {
    const { error } = await supabase.from("live_class_links").delete().eq("class_id", classId);
    return error ? SAVE_ERROR : null;
  }
  const { error } = await supabase
    .from("live_class_links")
    .upsert({ class_id: classId, join_url: joinUrl, passcode: passcode || null });
  return error ? SAVE_ERROR : null;
}

/** Cancel a class. Students who signed up see it as cancelled. */
export async function cancelClass(classId: unknown): Promise<Result> {
  await requireUser(TEACHER_SIDE);
  const id = z.uuid().safeParse(classId);
  if (!id.success) return { error: SAVE_ERROR };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_classes")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

/** Teacher ticks who was really there. Only the class's own teacher (or an admin) may do this. */
export async function markAttended(classId: unknown, studentId: unknown, attended: unknown): Promise<Result> {
  const user = await requireUser(TEACHER_SIDE);
  const input = z.object({ c: z.uuid(), s: z.uuid(), a: z.boolean() }).safeParse({ c: classId, s: studentId, a: attended });
  if (!input.success) return { error: SAVE_ERROR };
  const admin = createAdminClient();
  if (!admin) return { error: NO_ADMIN };
  const { data: c } = await admin.from("live_classes").select("teacher_id").eq("id", input.data.c).maybeSingle();
  if (!c || (user.role === "teacher" && c.teacher_id !== user.id)) return { error: SAVE_ERROR };
  const { error } = await admin
    .from("class_registrations")
    .update({ attended: input.data.a })
    .eq("class_id", input.data.c)
    .eq("user_id", input.data.s);
  if (error) return { error: SAVE_ERROR };
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Students: register, cancel, join, rate
// ---------------------------------------------------------------------------------------------

const REGISTER_MESSAGES: Record<string, string> = {
  full: "This class is full. Try another time.",
  ended: "This class has already finished.",
  cancelled: "This class was cancelled.",
  not_found: "We couldn't find this class.",
};

export async function registerForClass(classId: unknown): Promise<Result> {
  const user = await requireUser(STUDENT_SIDE);
  const id = z.uuid().safeParse(classId);
  if (!id.success) return { error: SAVE_ERROR };
  const admin = createAdminClient();
  if (!admin) return { error: NO_ADMIN };
  const { data, error } = await admin.rpc("register_for_class", { p_class: id.data, p_user: user.id });
  if (error) return { error: SAVE_ERROR };
  if (data !== "ok") return { error: REGISTER_MESSAGES[data as string] ?? SAVE_ERROR };
  refresh();
  return { ok: true };
}

export async function cancelMyRegistration(classId: unknown): Promise<Result> {
  const user = await requireUser(STUDENT_SIDE);
  const id = z.uuid().safeParse(classId);
  if (!id.success) return { error: SAVE_ERROR };
  const admin = createAdminClient();
  if (!admin) return { error: NO_ADMIN };
  const { data: c } = await admin.from("live_classes").select("starts_at").eq("id", id.data).maybeSingle();
  if (!c) return { error: REGISTER_MESSAGES.not_found };
  if (new Date(c.starts_at as string).getTime() <= Date.now()) return { error: "This class already started." };
  const { error } = await admin
    .from("class_registrations")
    .update({ status: "cancelled" })
    .eq("class_id", id.data)
    .eq("user_id", user.id);
  if (error) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

/**
 * The join link, only for a registered student, from 10 minutes before the class until a little
 * after it should end. Students can never read the link table directly.
 */
export async function getJoinLink(classId: unknown): Promise<{ error: string } | { url: string; passcode: string | null }> {
  const user = await requireUser(STUDENT_SIDE);
  const id = z.uuid().safeParse(classId);
  if (!id.success) return { error: SAVE_ERROR };
  const admin = createAdminClient();
  if (!admin) return { error: NO_ADMIN };

  const { data: c } = await admin
    .from("live_classes")
    .select("starts_at, duration_min, status")
    .eq("id", id.data)
    .maybeSingle();
  if (!c || c.status !== "scheduled") return { error: "This class was cancelled." };
  if (user.role === "student") {
    const { data: reg } = await admin
      .from("class_registrations")
      .select("status")
      .eq("class_id", id.data)
      .eq("user_id", user.id)
      .maybeSingle();
    if (reg?.status !== "registered") return { error: "Register for this class first." };
  }
  const start = new Date(c.starts_at as string).getTime();
  const end = start + (c.duration_min as number) * 60_000;
  const now = Date.now();
  if (now < start - JOIN_OPENS_MIN * 60_000) return { error: `The link opens ${JOIN_OPENS_MIN} minutes before the class.` };
  if (now > end + JOIN_GRACE_MIN * 60_000) return { error: "This class has finished." };

  const { data: link } = await admin.from("live_class_links").select("join_url, passcode").eq("class_id", id.data).maybeSingle();
  if (!link) return { error: "Your teacher hasn't added the link yet. Check again in a few minutes." };

  await admin
    .from("class_registrations")
    .update({ joined_at: new Date().toISOString() })
    .eq("class_id", id.data)
    .eq("user_id", user.id)
    .is("joined_at", null);
  return { url: link.join_url as string, passcode: (link.passcode as string | null) ?? null };
}

export async function rateClass(classId: unknown, rating: unknown): Promise<Result> {
  const user = await requireUser(STUDENT_SIDE);
  const input = z.object({ c: z.uuid(), r: z.number().int().min(1).max(5) }).safeParse({ c: classId, r: rating });
  if (!input.success) return { error: SAVE_ERROR };
  const admin = createAdminClient();
  if (!admin) return { error: NO_ADMIN };
  const { data: c } = await admin.from("live_classes").select("starts_at").eq("id", input.data.c).maybeSingle();
  if (!c || new Date(c.starts_at as string).getTime() > Date.now()) return { error: "You can rate a class after it starts." };
  const { data, error } = await admin
    .from("class_registrations")
    .update({ rating: input.data.r })
    .eq("class_id", input.data.c)
    .eq("user_id", user.id)
    .eq("status", "registered")
    .select("class_id");
  if (error || !data?.length) return { error: "Only students who registered can rate a class." };
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Teachers: their public profile
// ---------------------------------------------------------------------------------------------

const specialtyIds = SPECIALTIES.map((s) => s.id) as [string, ...string[]];
const profileSchema = z.object({
  headline: text(120).default(""),
  bio: text(1200).default(""),
  specialties: z.array(z.enum(specialtyIds)).max(6),
  speaks: z.array(z.enum(LANGUAGE_CODES)).max(6),
  isPublic: z.boolean(),
});

export async function saveTeacherProfile(input: unknown): Promise<Result> {
  const user = await requireUser(TEACHER_SIDE);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("teacher_profiles").upsert({
    user_id: user.id,
    headline: v.headline || null,
    bio: v.bio || null,
    specialties: [...new Set(v.specialties)],
    speaks: [...new Set(v.speaks)],
    is_public: v.isPublic,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/dashboard/teachers", "layout");
  revalidatePath("/teacher/profile");
  return { ok: true };
}

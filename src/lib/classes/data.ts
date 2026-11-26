import "server-only";

import { getAvatarUrls } from "@/lib/account/avatar";
import { MIN_RATINGS_TO_SHOW } from "@/lib/classes/constants";
import { getTeacherAcademy } from "@/lib/academies/profile";
import { MIN_REVIEWS_FOR_AVERAGE } from "@/lib/reviews/constants";
import { getReviewSummary } from "@/lib/reviews/data";
import { toProfileLinks, type ProfileLink, type SocialLinks } from "@/lib/profile/links";
import { getClassScope, inScope } from "@/lib/classes/scope";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type TeacherBrief = { id: string; name: string; avatarUrl: string | null; headline: string | null };

export type ClassCard = {
  id: string;
  title: string;
  courseTitle: string;
  skill: string;
  level: string;
  startsAt: string;
  durationMin: number;
  capacity: number | null;
  status: "scheduled" | "cancelled";
  description: string | null;
  teacher: TeacherBrief;
  /** How many students are registered. */
  taken: number;
  /** Is the person asking registered? */
  registered: boolean;
  /** Has the teacher added a join link? (The link itself is never sent to the page.) */
  hasLink: boolean;
};

type ClassRow = {
  id: string;
  teacher_id: string;
  course_title: string;
  title: string;
  description: string | null;
  syllabus: string | null;
  skill: string;
  level: string;
  starts_at: string;
  duration_min: number;
  capacity: number | null;
  status: "scheduled" | "cancelled";
};

const CLASS_COLS =
  "id, teacher_id, course_title, title, description, syllabus, skill, level, starts_at, duration_min, capacity, status";
/** The longest class is 4 hours; used to find classes that may still be running. */
const MAX_CLASS_MS = 4 * 60 * 60_000;

const endMs = (r: Pick<ClassRow, "starts_at" | "duration_min">) =>
  new Date(r.starts_at).getTime() + r.duration_min * 60_000;

/** Name, photo and one-line headline for a set of teachers. */
async function teacherBriefs(admin: Admin, ids: string[]): Promise<Map<string, TeacherBrief>> {
  const map = new Map<string, TeacherBrief>();
  if (ids.length === 0) return map;
  const [{ data: profiles }, { data: details }] = await Promise.all([
    admin.from("profiles").select("id, full_name, avatar_path").in("id", ids),
    admin.from("teacher_profiles").select("user_id, headline").in("user_id", ids),
  ]);
  const urls = await getAvatarUrls((profiles ?? []).map((p) => p.avatar_path as string | null));
  const headlines = new Map((details ?? []).map((d) => [d.user_id as string, d.headline as string | null]));
  for (const p of profiles ?? []) {
    map.set(p.id as string, {
      id: p.id as string,
      name: (p.full_name as string | null) ?? "Teacher",
      avatarUrl: p.avatar_path ? (urls.get(p.avatar_path as string) ?? null) : null,
      headline: headlines.get(p.id as string) ?? null,
    });
  }
  return map;
}

/** Adds teacher, seat counts, "am I registered" and "has a link" to class rows. */
async function toCards(admin: Admin, rows: ClassRow[], userId: string | null): Promise<ClassCard[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [teachers, regs, links] = await Promise.all([
    teacherBriefs(admin, [...new Set(rows.map((r) => r.teacher_id))]),
    admin.from("class_registrations").select("class_id, user_id").in("class_id", ids).eq("status", "registered"),
    admin.from("live_class_links").select("class_id").in("class_id", ids),
  ]);
  const taken = new Map<string, number>();
  const mine = new Set<string>();
  for (const r of regs.data ?? []) {
    taken.set(r.class_id as string, (taken.get(r.class_id as string) ?? 0) + 1);
    if (userId && r.user_id === userId) mine.add(r.class_id as string);
  }
  const withLink = new Set((links.data ?? []).map((l) => l.class_id as string));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    courseTitle: r.course_title,
    skill: r.skill,
    level: r.level,
    startsAt: r.starts_at,
    durationMin: r.duration_min,
    capacity: r.capacity,
    status: r.status,
    description: r.description,
    teacher: teachers.get(r.teacher_id) ?? { id: r.teacher_id, name: "Teacher", avatarUrl: null, headline: null },
    taken: taken.get(r.id) ?? 0,
    registered: mine.has(r.id),
    hasLink: withLink.has(r.id),
  }));
}

/** Classes starting in a time window, for the day strip and list. Cancelled ones only if you were registered. */
export async function listClassesBetween(fromIso: string, toIso: string, userId: string): Promise<ClassCard[] | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("live_classes")
    .select(CLASS_COLS)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .neq("kind", "1to1") // 1:1 slots are booked on the teacher's page, not in the group class list
    .order("starts_at");
  const [cards, scope] = await Promise.all([toCards(admin, (data ?? []) as ClassRow[], userId), getClassScope(userId)]);
  // Only your own school's teachers (or listed ones, if you study on your own). A class you registered for always stays.
  return cards.filter((c) => c.registered || (c.status === "scheduled" && inScope(scope, c.teacher.id)));
}

/** The classes a student signed up for: still to come (soonest first) and recent ones (newest first). */
export async function listMyClasses(userId: string): Promise<{ upcoming: ClassCard[]; past: ClassCard[] } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: regs } = await admin
    .from("class_registrations")
    .select("class_id")
    .eq("user_id", userId)
    .eq("status", "registered");
  const ids = (regs ?? []).map((r) => r.class_id as string);
  if (ids.length === 0) return { upcoming: [], past: [] };
  const { data } = await admin.from("live_classes").select(CLASS_COLS).in("id", ids).order("starts_at");
  const rows = (data ?? []) as ClassRow[];
  const now = Date.now();
  const cards = await toCards(admin, rows, userId);
  const endOf = new Map(rows.map((r) => [r.id, endMs(r)]));
  const upcoming = cards.filter((c) => (endOf.get(c.id) ?? 0) > now && c.status === "scheduled");
  const past = cards
    .filter((c) => (endOf.get(c.id) ?? 0) <= now || c.status === "cancelled")
    .reverse()
    .slice(0, 10);
  return { upcoming, past };
}

export type TeacherDetails = TeacherBrief & {
  bio: string | null;
  specialties: string[];
  speaks: string[];
  isPublic: boolean;
  /** Average of student ratings, only when enough students rated. */
  rating: { average: number; count: number } | null;
  /** Website and social pages, already checked (https, known sites). */
  links: ProfileLink[];
  qualifications: string[];
  /** The academy they teach at, if it has a short name. */
  academy: { id: string; name: string; slug: string; listed: boolean } | null;
};

/** A teacher's public profile. Null if this person is not a teacher/admin or has no profile row. */
export async function getTeacherDetails(admin: Admin, teacherId: string): Promise<TeacherDetails | null> {
  const [{ data: profile }, { data: detail }, { data: classes }] = await Promise.all([
    admin.from("profiles").select("id, full_name, avatar_path, role").eq("id", teacherId).maybeSingle(),
    admin.from("teacher_profiles").select("headline, bio, specialties, speaks, is_public, website_url, social_links, qualifications").eq("user_id", teacherId).maybeSingle(),
    admin.from("live_classes").select("id").eq("teacher_id", teacherId),
  ]);
  if (!profile || !["teacher", "academy_admin", "super_admin"].includes(profile.role as string)) return null;

  let rating: TeacherDetails["rating"] = null;
  const classIds = (classes ?? []).map((c) => c.id as string);
  if (classIds.length) {
    const { data: rated } = await admin
      .from("class_registrations")
      .select("rating")
      .in("class_id", classIds)
      .not("rating", "is", null);
    const values = (rated ?? []).map((r) => r.rating as number);
    if (values.length >= MIN_RATINGS_TO_SHOW) {
      rating = { average: values.reduce((a, b) => a + b, 0) / values.length, count: values.length };
    }
  }
  // Verified reviews are the rating students trust; the older class ratings only fill in until there are enough reviews.
  const reviewSummary = await getReviewSummary(admin, { teacherId });
  if (reviewSummary.count >= MIN_REVIEWS_FOR_AVERAGE) rating = { average: reviewSummary.average, count: reviewSummary.count };
  const urls = await getAvatarUrls([profile.avatar_path as string | null]);
  return {
    id: teacherId,
    name: (profile.full_name as string | null) ?? "Teacher",
    avatarUrl: profile.avatar_path ? (urls.get(profile.avatar_path as string) ?? null) : null,
    headline: (detail?.headline as string | null) ?? null,
    bio: (detail?.bio as string | null) ?? null,
    specialties: (detail?.specialties as string[] | null) ?? [],
    speaks: (detail?.speaks as string[] | null) ?? [],
    // A teacher who never filled in a profile is still shown.
    isPublic: detail ? (detail.is_public as boolean) : true,
    rating,
    links: toProfileLinks(detail?.website_url, detail?.social_links),
    qualifications: (detail?.qualifications as string[] | null) ?? [],
    academy: await getTeacherAcademy(admin, teacherId),
  };
}

export type CourseNow = { title: string; skill: string; level: string; classCount: number; nextStartsAt: string; nextClassId: string };

/** What a teacher is teaching right now: their upcoming classes grouped by course. */
export async function getCoursesNow(admin: Admin, teacherId: string): Promise<CourseNow[]> {
  const { data } = await admin
    .from("live_classes")
    .select("id, course_title, skill, level, starts_at, duration_min")
    .eq("teacher_id", teacherId)
    .eq("status", "scheduled")
    .neq("kind", "1to1") // 1:1 slots are offered on their own, they are not a course
    .gte("starts_at", new Date(Date.now() - MAX_CLASS_MS).toISOString())
    .order("starts_at");
  const now = Date.now();
  const map = new Map<string, CourseNow>();
  for (const r of (data ?? []) as Pick<ClassRow, "id" | "course_title" | "skill" | "level" | "starts_at" | "duration_min">[]) {
    if (endMs(r) <= now) continue;
    const known = map.get(r.course_title);
    if (known) known.classCount += 1;
    else
      map.set(r.course_title, {
        title: r.course_title,
        skill: r.skill,
        level: r.level,
        classCount: 1,
        nextStartsAt: r.starts_at,
        nextClassId: r.id,
      });
  }
  return [...map.values()];
}

/** Everything the student's class page needs. Null = no such class. */
export async function getClassDetail(id: string, userId: string) {
  const admin = createAdminClient();
  if (!admin) return { unavailable: true as const };
  const { data } = await admin.from("live_classes").select(CLASS_COLS).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as ClassRow;
  const [[card], teacher, { data: mine }, scope] = await Promise.all([
    toCards(admin, [row], userId),
    getTeacherDetails(admin, row.teacher_id),
    admin
      .from("class_registrations")
      .select("status, rating, joined_at")
      .eq("class_id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    getClassScope(userId),
  ]);
  // The same answer as "no such class" for another school's class you did not register for.
  if (!card.registered && !inScope(scope, row.teacher_id)) return null;
  return {
    unavailable: false as const,
    card,
    syllabus: row.syllabus,
    teacher,
    myRating: (mine?.status === "registered" ? (mine.rating as number | null) : null) ?? null,
  };
}

/** A teacher's upcoming classes (for their profile page). */
export async function listTeacherUpcoming(teacherId: string, userId: string, limit = 8): Promise<ClassCard[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("live_classes")
    .select(CLASS_COLS)
    .eq("teacher_id", teacherId)
    .eq("status", "scheduled")
    .neq("kind", "1to1") // booked from "Book a 1:1 lesson", not listed as a class
    .gte("starts_at", new Date(Date.now() - MAX_CLASS_MS).toISOString())
    .order("starts_at")
    .limit(limit + 4);
  const now = Date.now();
  const rows = ((data ?? []) as ClassRow[]).filter((r) => endMs(r) > now).slice(0, limit);
  return toCards(admin, rows, userId);
}

/** Classes for the teacher screens (one teacher) or the admin screen (null = everyone). */
export async function listManagedClasses(
  teacherId: string | null,
  scope: "upcoming" | "past",
): Promise<ClassCard[] | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const now = Date.now();
  let q = admin.from("live_classes").select(CLASS_COLS);
  if (teacherId) q = q.eq("teacher_id", teacherId);
  q =
    scope === "upcoming"
      ? q.gte("starts_at", new Date(now - MAX_CLASS_MS).toISOString()).order("starts_at")
      : q.lt("starts_at", new Date(now).toISOString()).order("starts_at", { ascending: false }).limit(60);
  const { data } = await q;
  const rows = ((data ?? []) as ClassRow[]).filter((r) => (scope === "upcoming" ? endMs(r) > now : endMs(r) <= now));
  return toCards(admin, rows, null);
}

export type Registrant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  attended: boolean | null;
  rating: number | null;
};

/** One class for the edit screen: the row, its link, and who is registered. Null = not found. */
export async function getClassForEdit(id: string) {
  const admin = createAdminClient();
  if (!admin) return { unavailable: true as const };
  const { data } = await admin.from("live_classes").select(CLASS_COLS).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as ClassRow;
  const [{ data: link }, { data: regs }, teachers] = await Promise.all([
    admin.from("live_class_links").select("join_url, passcode").eq("class_id", id).maybeSingle(),
    admin
      .from("class_registrations")
      .select("user_id, joined_at, attended, rating")
      .eq("class_id", id)
      .eq("status", "registered")
      .order("registered_at"),
    teacherBriefs(admin, [row.teacher_id]),
  ]);
  const userIds = (regs ?? []).map((r) => r.user_id as string);
  const { data: people } = userIds.length
    ? await admin.from("profiles").select("id, full_name, avatar_path").in("id", userIds)
    : { data: [] };
  const urls = await getAvatarUrls((people ?? []).map((p) => p.avatar_path as string | null));
  const byId = new Map((people ?? []).map((p) => [p.id as string, p]));
  const registrants: Registrant[] = (regs ?? []).map((r) => {
    const p = byId.get(r.user_id as string);
    return {
      userId: r.user_id as string,
      name: (p?.full_name as string | null) ?? "Student",
      avatarUrl: p?.avatar_path ? (urls.get(p.avatar_path as string) ?? null) : null,
      joinedAt: r.joined_at as string | null,
      attended: r.attended as boolean | null,
      rating: r.rating as number | null,
    };
  });
  return {
    unavailable: false as const,
    row,
    teacher: teachers.get(row.teacher_id) ?? null,
    joinUrl: (link?.join_url as string | null) ?? "",
    passcode: (link?.passcode as string | null) ?? "",
    registrants,
  };
}

/** Teachers an admin can give a class to. */
export async function listTeacherOptions(): Promise<{ id: string; name: string }[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("profiles").select("id, full_name").eq("role", "teacher").order("full_name");
  return (data ?? []).map((p) => ({ id: p.id as string, name: (p.full_name as string | null) ?? "Teacher" }));
}

/** Course names a teacher used before, to suggest while creating a class. */
export async function listCourseTitles(teacherId: string | null): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  let q = admin.from("live_classes").select("course_title").neq("kind", "1to1").order("created_at", { ascending: false }).limit(60);
  if (teacherId) q = q.eq("teacher_id", teacherId);
  const { data } = await q;
  return [...new Set((data ?? []).map((r) => r.course_title as string))].slice(0, 6);
}

/** A teacher's own editable profile (for /teacher/profile). */
export async function getOwnTeacherProfile(userId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const [{ data: profile }, { data: detail }] = await Promise.all([
    admin.from("profiles").select("full_name, avatar_path").eq("id", userId).maybeSingle(),
    admin.from("teacher_profiles").select("headline, bio, specialties, speaks, is_public, website_url, social_links, qualifications").eq("user_id", userId).maybeSingle(),
  ]);
  const social: SocialLinks = {};
  for (const l of toProfileLinks(null, detail?.social_links)) if (l.key !== "website") social[l.key] = l.url;
  const urls = await getAvatarUrls([profile?.avatar_path as string | null]);
  return {
    name: (profile?.full_name as string | null) ?? "",
    avatarUrl: profile?.avatar_path ? (urls.get(profile.avatar_path as string) ?? null) : null,
    headline: (detail?.headline as string | null) ?? "",
    bio: (detail?.bio as string | null) ?? "",
    specialties: (detail?.specialties as string[] | null) ?? [],
    speaks: (detail?.speaks as string[] | null) ?? [],
    isPublic: detail ? (detail.is_public as boolean) : true,
    website: (detail?.website_url as string | null) ?? "",
    social,
    qualifications: (detail?.qualifications as string[] | null) ?? [],
  };
}

/** For the dashboard card: the student's next registered class, or whether any class is coming up at all. */
export async function getDashboardClass(userId: string): Promise<{ next: ClassCard | null; anyUpcoming: boolean } | null> {
  const mine = await listMyClasses(userId);
  if (mine === null) return null;
  if (mine.upcoming[0]) return { next: mine.upcoming[0], anyUpcoming: true };
  const admin = createAdminClient();
  if (!admin) return null;
  const [{ data: rows }, scope] = await Promise.all([
    admin.from("live_classes").select("teacher_id").eq("status", "scheduled").neq("kind", "1to1").gt("starts_at", new Date().toISOString()).limit(500),
    getClassScope(userId),
  ]);
  return { next: null, anyUpcoming: ((rows ?? []) as { teacher_id: string }[]).some((r) => inScope(scope, r.teacher_id)) };
}

/** The recording link of a class, read on its own so a missing column never breaks the class pages. */
/** For a 1:1 lesson: its price (null = not set). Returns null when the class is not a 1:1 lesson. */
export async function getOneToOneInfo(classId: string): Promise<{ priceEurCents: number | null } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("live_classes").select("kind, price_eur_cents").eq("id", classId).maybeSingle();
  return data?.kind === "1to1" ? { priceEurCents: (data.price_eur_cents as number | null) ?? null } : null;
}

export async function getRecordingUrl(classId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("live_classes").select("recording_url").eq("id", classId).maybeSingle();
  return error ? null : ((data?.recording_url as string | null) ?? null);
}

/** The teacher's saved room link (their own only; used to start new classes with it). */
export async function getDefaultRoom(teacherId: string): Promise<{ joinUrl: string; passcode: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("teacher_room_links").select("join_url, passcode").eq("teacher_id", teacherId).maybeSingle();
  return error || !data ? null : { joinUrl: data.join_url as string, passcode: (data.passcode as string | null) ?? "" };
}

/** May this student watch the recording? Registered for the class, or in the class's batch, and the class has started. */
export async function canWatchRecording(classId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data: c } = await admin.from("live_classes").select("starts_at, batch_id").eq("id", classId).maybeSingle();
  if (!c || new Date(c.starts_at as string).getTime() > Date.now()) return false;
  const { data: reg } = await admin.from("class_registrations").select("status").eq("class_id", classId).eq("user_id", userId).eq("status", "registered").maybeSingle();
  if (reg) return true;
  const batchId = (c as { batch_id?: string | null }).batch_id;
  if (!batchId) return false;
  const { data: m } = await admin.from("batch_members").select("batch_id").eq("batch_id", batchId).eq("student_id", userId).maybeSingle();
  return !!m;
}

/**
 * The student's timetable: upcoming classes they registered for, plus upcoming classes of their batches.
 * Grouped by the caller. Cancelled classes are left out.
 */
export async function listMyTimetable(userId: string): Promise<ClassCard[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const [mine, { data: bm }] = await Promise.all([listMyClasses(userId), admin.from("batch_members").select("batch_id").eq("student_id", userId)]);
  const batchIds = ((bm ?? []) as { batch_id: string }[]).map((r) => r.batch_id);
  const out = new Map<string, ClassCard>((mine?.upcoming ?? []).map((c) => [c.id, c]));
  if (batchIds.length) {
    const { data } = await admin
      .from("live_classes")
      .select(CLASS_COLS)
      .in("batch_id", batchIds)
      .eq("status", "scheduled")
      .gte("starts_at", new Date(Date.now() - MAX_CLASS_MS).toISOString())
      .order("starts_at")
      .limit(60);
    const now = Date.now();
    const rows = ((data ?? []) as ClassRow[]).filter((r) => endMs(r) > now && !out.has(r.id));
    for (const c of await toCards(admin, rows, userId)) out.set(c.id, c);
  }
  return [...out.values()].filter((c) => c.status === "scheduled").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export type OneToOneSlot = { id: string; startsAt: string; durationMin: number; priceEurCents: number | null; booked: boolean; bookedBy: string | null };

/** Free (and booked) 1:1 slots of a teacher. Students see only the free future ones; the teacher also sees who booked. */
export async function listOneToOneSlots(teacherId: string, forTeacher: boolean): Promise<OneToOneSlot[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("live_classes")
    .select("id, starts_at, duration_min, price_eur_cents")
    .eq("teacher_id", teacherId)
    .eq("kind", "1to1")
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(60);
  if (error) return [];
  const rows = (data ?? []) as { id: string; starts_at: string; duration_min: number; price_eur_cents: number | null }[];
  if (!rows.length) return [];
  const { data: regs } = await admin.from("class_registrations").select("class_id, user_id").in("class_id", rows.map((r) => r.id)).eq("status", "registered");
  const who = new Map(((regs ?? []) as { class_id: string; user_id: string }[]).map((r) => [r.class_id, r.user_id]));
  const names = new Map<string, string>();
  if (forTeacher && who.size) {
    for (const p of ((await admin.from("profiles").select("id, full_name").in("id", [...who.values()])).data ?? []) as { id: string; full_name: string | null }[]) names.set(p.id, p.full_name ?? "Student");
  }
  const slots = rows.map((r) => ({ id: r.id, startsAt: r.starts_at, durationMin: r.duration_min, priceEurCents: r.price_eur_cents, booked: who.has(r.id), bookedBy: who.has(r.id) ? (names.get(who.get(r.id)!) ?? null) : null }));
  return forTeacher ? slots : slots.filter((s) => !s.booked);
}

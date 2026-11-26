import "server-only";

import { getAvatarUrls } from "@/lib/account/avatar";
import { cleanLanguages } from "@/lib/languages";
import { earnedBadges, type Badge } from "@/lib/reputation/badges";
import { getTeacherStats } from "@/lib/reputation/data";
import { MIN_REVIEWS_FOR_AVERAGE } from "@/lib/reviews/constants";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type DirectoryTeacher = {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  academy: { id: string; name: string; slug: string };
  /** Average of verified reviews, only from enough reviews. */
  rating: { average: number; count: number } | null;
  reviewCount: number;
  /** Languages the teacher or the academy explains in. */
  languages: string[];
  specialties: string[];
  qualification: string | null;
  upcomingClasses: number;
  openSlots: number;
  /** An open trial lesson a new student can book now. */
  trialAvailable: boolean;
  badges: Badge[];
};

export type DirectoryFilters = { lang?: string; skill?: string; slots?: boolean; trial?: boolean };

/**
 * Teachers of academies that chose to be listed, whose own profile is public. Nobody else appears.
 * Best first: a verified average, then more reviews, then name.
 */
export async function listDirectory(admin: Admin, filters: DirectoryFilters = {}): Promise<DirectoryTeacher[]> {
  const { data: acads } = await admin.from("academies").select("id, name, slug, languages").eq("is_listed", true).not("slug", "is", null).limit(200);
  const academies = (acads ?? []) as { id: string; name: string; slug: string; languages: string[] | null }[];
  if (!academies.length) return [];

  const { data: mem } = await admin.from("academy_members").select("academy_id, user_id").in("academy_id", academies.map((a) => a.id));
  const members = (mem ?? []) as { academy_id: string; user_id: string }[];
  const ids = [...new Set(members.map((m) => m.user_id))];
  if (!ids.length) return [];

  const nowIso = new Date().toISOString();
  const [profiles, details, reviews, classes] = await Promise.all([
    admin.from("profiles").select("id, full_name, avatar_path, role").in("id", ids),
    admin.from("teacher_profiles").select("user_id, headline, specialties, speaks, is_public, qualifications").in("user_id", ids),
    admin.from("teacher_reviews").select("teacher_id, rating").eq("status", "published").in("teacher_id", ids).limit(5000),
    admin.from("live_classes").select("id, teacher_id, kind, is_trial").in("teacher_id", ids).eq("status", "scheduled").gte("starts_at", nowIso).limit(2000),
  ]);

  const detail = new Map(((details.data ?? []) as { user_id: string; headline: string | null; specialties: string[] | null; speaks: string[] | null; is_public: boolean; qualifications: string[] | null }[]).map((d) => [d.user_id, d]));
  const people = ((profiles.data ?? []) as { id: string; full_name: string | null; avatar_path: string | null; role: string }[]).filter((p) => p.role === "teacher" && detail.get(p.id)?.is_public !== false);

  const stars = new Map<string, number[]>();
  for (const r of (reviews.data ?? []) as { teacher_id: string; rating: number }[]) stars.set(r.teacher_id, [...(stars.get(r.teacher_id) ?? []), r.rating]);

  const classRows = (classes.data ?? []) as { id: string; teacher_id: string; kind: string | null; is_trial: boolean | null }[];
  const oneToOne = classRows.filter((c) => c.kind === "1to1");
  const booked = new Set<string>();
  if (oneToOne.length) {
    const { data: regs } = await admin.from("class_registrations").select("class_id").in("class_id", oneToOne.map((c) => c.id)).eq("status", "registered");
    for (const r of (regs ?? []) as { class_id: string }[]) booked.add(r.class_id);
  }
  const [urls, stats] = await Promise.all([getAvatarUrls(people.map((p) => p.avatar_path)), getTeacherStats(admin, people.map((p) => p.id))]);

  const out: DirectoryTeacher[] = [];
  for (const p of people) {
    const academy = academies.find((a) => members.some((m) => m.user_id === p.id && m.academy_id === a.id));
    if (!academy) continue;
    const d = detail.get(p.id);
    const values = stars.get(p.id) ?? [];
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const languages = [...new Set([...(d?.speaks ?? []), ...(academy.languages ?? [])])];
    out.push({
      id: p.id,
      name: p.full_name ?? "Teacher",
      avatarUrl: p.avatar_path ? (urls.get(p.avatar_path) ?? null) : null,
      headline: d?.headline ?? null,
      academy: { id: academy.id, name: academy.name, slug: academy.slug },
      rating: values.length >= MIN_REVIEWS_FOR_AVERAGE ? { average, count: values.length } : null,
      reviewCount: values.length,
      languages: languages.length ? cleanLanguages(languages) : [],
      specialties: d?.specialties ?? [],
      qualification: d?.qualifications?.[0] ?? null,
      upcomingClasses: classRows.filter((c) => c.teacher_id === p.id && c.kind !== "1to1").length,
      openSlots: oneToOne.filter((c) => c.teacher_id === p.id && !booked.has(c.id)).length,
      badges: earnedBadges(stats.get(p.id)!),
      trialAvailable: oneToOne.some((c) => c.teacher_id === p.id && c.is_trial && !booked.has(c.id)),
    });
  }

  return out
    .filter((t) => !filters.lang || t.languages.includes(filters.lang))
    .filter((t) => !filters.skill || t.specialties.includes(filters.skill))
    .filter((t) => !filters.slots || t.openSlots > 0)
    .filter((t) => !filters.trial || t.trialAvailable)
    .sort((a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0) || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name));
}

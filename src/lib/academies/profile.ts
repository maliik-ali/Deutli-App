import "server-only";

import { getAvatarUrls } from "@/lib/account/avatar";
import type { CurrentUser } from "@/lib/auth/dal";
import { getBrandById } from "@/lib/branding/data";
import { cleanLanguages, type LanguageCode } from "@/lib/languages";
import { toProfileLinks, type ProfileLink, type SocialLinks } from "@/lib/profile/links";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** What an owner edits on "Academy profile". */
export type AcademyProfileValues = {
  tagline: string;
  about: string;
  country: string;
  languages: LanguageCode[];
  website: string;
  social: SocialLinks;
  /** Shown in "Find a teacher" for students who have no teacher yet. Off until the owner switches it on. */
  isListed: boolean;
};

export type AcademyTeacher = { id: string; name: string; avatarUrl: string | null; headline: string | null };

/** What a student sees on an academy's page. Links are re-checked on the way out. */
export type AcademyProfile = {
  id: string;
  slug: string;
  name: string;
  kind: "teacher" | "school";
  logoUrl: string | null;
  tagline: string | null;
  about: string | null;
  country: string | null;
  languages: LanguageCode[];
  links: ProfileLink[];
  teachers: AcademyTeacher[];
};

const COLS = "id, slug, name, kind, tagline, about, country, languages, website_url, social_links, is_listed";

type Row = {
  id: string;
  slug: string | null;
  name: string;
  kind: "teacher" | "school";
  tagline: string | null;
  about: string | null;
  country: string | null;
  languages: string[] | null;
  website_url: string | null;
  social_links: unknown;
  is_listed: boolean | null;
};

/** The editable values of one academy (for the owner's form). */
export async function getAcademyProfileValues(admin: Admin, academyId: string): Promise<AcademyProfileValues> {
  const { data } = await admin.from("academies").select(COLS).eq("id", academyId).maybeSingle();
  const r = data as Row | null;
  const social: SocialLinks = {};
  for (const l of toProfileLinks(null, r?.social_links)) if (l.key !== "website") social[l.key] = l.url;
  return {
    tagline: r?.tagline ?? "",
    about: r?.about ?? "",
    country: r?.country ?? "",
    languages: r?.languages?.length ? cleanLanguages(r.languages) : [],
    website: r?.website_url ?? "",
    social,
    isListed: !!r?.is_listed,
  };
}

/** The public view of an academy, found by its short name (slug). Null if there is none. */
export async function getAcademyProfileBySlug(admin: Admin, slug: string): Promise<AcademyProfile | null> {
  const { data } = await admin.from("academies").select(COLS).eq("slug", slug).maybeSingle();
  const r = data as Row | null;
  if (!r || !r.slug) return null;

  const [brand, members] = await Promise.all([
    getBrandById(r.id), // name and logo exactly as students see them elsewhere (the logo only if the plan has it)
    admin.from("academy_members").select("user_id, role").eq("academy_id", r.id),
  ]);
  const ids = [...new Set(((members.data ?? []) as { user_id: string }[]).map((m) => m.user_id))];
  const teachers: AcademyTeacher[] = [];
  if (ids.length) {
    const [profiles, details] = await Promise.all([
      admin.from("profiles").select("id, full_name, avatar_path, role").in("id", ids),
      admin.from("teacher_profiles").select("user_id, headline, is_public").in("user_id", ids),
    ]);
    const detail = new Map(((details.data ?? []) as { user_id: string; headline: string | null; is_public: boolean }[]).map((d) => [d.user_id, d]));
    const people = ((profiles.data ?? []) as { id: string; full_name: string | null; avatar_path: string | null; role: string }[]).filter((p) => p.role === "teacher" && detail.get(p.id)?.is_public !== false);
    const urls = await getAvatarUrls(people.map((p) => p.avatar_path));
    for (const p of people) {
      teachers.push({ id: p.id, name: p.full_name ?? "Teacher", avatarUrl: p.avatar_path ? (urls.get(p.avatar_path) ?? null) : null, headline: detail.get(p.id)?.headline ?? null });
    }
    teachers.sort((a, b) => a.name.localeCompare(b.name));
  }
  return {
    id: r.id,
    slug: r.slug,
    name: brand?.name ?? r.name,
    kind: r.kind,
    logoUrl: brand?.logoUrl ?? null,
    tagline: r.tagline,
    about: r.about,
    country: r.country,
    languages: r.languages?.length ? cleanLanguages(r.languages) : [],
    links: toProfileLinks(r.website_url, r.social_links),
    teachers,
  };
}

/**
 * Who may open an academy's page: anyone, if the academy chose to be listed in "Find a teacher"; otherwise only people who
 * belong to it (its students, students of its teachers, its teachers) and Deutli admins.
 */
export async function canViewAcademy(admin: Admin, user: Pick<CurrentUser, "id" | "role" | "teacherId">, academyId: string): Promise<boolean> {
  if (user.role === "super_admin" || user.role === "academy_admin") return true;
  // A listed academy is open to every student: that is the point of listing.
  const { data: listed } = await admin.from("academies").select("is_listed").eq("id", academyId).maybeSingle();
  if (listed?.is_listed) return true;
  const [mine, member] = await Promise.all([
    admin.from("profiles").select("academy_id").eq("id", user.id).maybeSingle(),
    admin.from("academy_members").select("user_id").eq("academy_id", academyId).in("user_id", [user.id, ...(user.teacherId ? [user.teacherId] : [])]).limit(1),
  ]);
  return mine.data?.academy_id === academyId || (member.data ?? []).length > 0;
}

/** The academy a teacher belongs to (their own first), for the "Teaches at …" line. Null if they have none or no short name. */
export async function getTeacherAcademy(admin: Admin, teacherId: string): Promise<{ id: string; name: string; slug: string; listed: boolean } | null> {
  const { data: rows } = await admin.from("academy_members").select("academy_id, role").eq("user_id", teacherId);
  const mine = (rows ?? []) as { academy_id: string; role: string }[];
  if (!mine.length) return null;
  const { data } = await admin.from("academies").select("id, name, slug, is_listed").in("id", mine.map((m) => m.academy_id));
  const all = ((data ?? []) as { id: string; name: string; slug: string | null; is_listed: boolean | null }[]).filter((a) => a.slug);
  const pick = all.find((a) => mine.find((m) => m.academy_id === a.id)?.role === "owner") ?? all[0];
  if (!pick || !pick.slug) return null;
  const brand = await getBrandById(pick.id);
  return { id: pick.id, name: brand?.name ?? pick.name, slug: pick.slug, listed: !!pick.is_listed };
}

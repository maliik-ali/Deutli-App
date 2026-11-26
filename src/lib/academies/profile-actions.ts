"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { LANGUAGE_CODES } from "@/lib/languages";
import { checkLinks } from "@/lib/profile/links";
import { createAdminClient } from "@/lib/supabase/admin";

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);

const schema = z.object({
  tagline: text(120).default(""),
  about: text(800).default(""),
  country: text(60).default(""),
  languages: z.array(z.enum(LANGUAGE_CODES)).max(6).default([]),
  website: text(300).default(""),
  social: z.record(z.string(), text(300)).default({}),
  isListed: z.boolean().default(false),
});

/**
 * Saves the public profile of the teacher's own academy. Only the owner or an admin of the workspace may do it:
 * the check is made here on the server, and the academy row is written with the secret key (members have no write policy).
 */
export async function saveAcademyProfile(input: unknown): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  if (!ws) return { error: "You don't have an academy yet. Please contact us." };
  if (ws.role === "teacher") return { error: "Only the owner of the academy can change its profile." };
  const p = schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const links = checkLinks({ website: p.data.website, social: p.data.social });
  if ("error" in links) return links;
  // Listing puts the academy in front of new students, so it needs enough to choose by.
  if (p.data.isListed && (!p.data.tagline || !p.data.about || p.data.languages.length === 0)) {
    return { error: "To list your academy, add a tagline, an about text and the languages you explain in." };
  }
  const admin = createAdminClient();
  if (!admin) return { error: "We couldn't save this. Please try again in a few minutes." };
  const { data: before } = await admin.from("academies").select("is_listed").eq("id", ws.workspace.id).maybeSingle();

  const { error } = await admin
    .from("academies")
    .update({
      tagline: p.data.tagline || null,
      about: p.data.about || null,
      country: p.data.country || null,
      languages: [...new Set(p.data.languages)],
      website_url: links.website,
      social_links: links.social,
      is_listed: p.data.isListed,
      ...(p.data.isListed && !before?.is_listed ? { listed_at: new Date().toISOString() } : {}),
    })
    .eq("id", ws.workspace.id);
  if (error) return { error: "We couldn't save this. Check your internet and try again." };
  revalidatePath("/teacher/profile");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

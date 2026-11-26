import { AcademyProfileForm } from "@/components/academies/academy-profile-form";
import { getMyWorkspace } from "@/lib/academies/data";
import { getAcademyProfileBySlug, getAcademyProfileValues } from "@/lib/academies/profile";
import type { Role } from "@/lib/auth/roles";
import { getBrandById } from "@/lib/branding/data";
import { createAdminClient } from "@/lib/supabase/admin";

const note = (text: string) => <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">{text}</p>;

/** The "Academy" tab of the Profile page: the owner's form for the academy's public page, with a live preview. */
export async function AcademyProfileSection({ userId, role }: { userId: string; role: Role }) {
  const ws = role === "teacher" ? await getMyWorkspace(userId) : null;
  const admin = createAdminClient();
  if (!ws || !admin) return note("The academy profile belongs to a teacher's academy. Admins set up academies under Workspaces.");
  if (ws.role === "teacher") return note(`Only the owner of ${ws.workspace.name} can change the academy profile.`);

  const [values, brand, existing] = await Promise.all([
    getAcademyProfileValues(admin, ws.workspace.id),
    getBrandById(ws.workspace.id),
    ws.workspace.slug ? getAcademyProfileBySlug(admin, ws.workspace.slug) : Promise.resolve(null),
  ]);
  return (
    <AcademyProfileForm
      initial={values}
      name={brand?.name ?? ws.workspace.name}
      logoUrl={brand?.logoUrl ?? null}
      teachers={(existing?.teachers ?? []).map((t) => ({ id: t.id, name: t.name, avatarUrl: t.avatarUrl, headline: t.headline }))}
      solo={ws.workspace.kind === "teacher"}
    />
  );
}

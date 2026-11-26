import type { Metadata } from "next";

import { AcademyProfileForm } from "@/components/academies/academy-profile-form";
import { getMyWorkspace } from "@/lib/academies/data";
import { getAcademyProfileBySlug, getAcademyProfileValues } from "@/lib/academies/profile";
import { requireUser } from "@/lib/auth/dal";
import { getBrandById } from "@/lib/branding/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Academy profile" };

export default async function AcademyProfilePage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const ws = user.role === "teacher" ? await getMyWorkspace(user.id) : null;
  const admin = createAdminClient();

  const note = (text: string) => <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">{text}</p>;
  let body: React.ReactNode;
  if (!ws || !admin) body = note("The academy profile belongs to a teacher's academy. Admins set up academies under Workspaces.");
  else if (ws.role === "teacher") body = note(`Only the owner of ${ws.workspace.name} can change the academy profile.`);
  else {
    const [values, brand, existing] = await Promise.all([
      getAcademyProfileValues(admin, ws.workspace.id),
      getBrandById(ws.workspace.id),
      ws.workspace.slug ? getAcademyProfileBySlug(admin, ws.workspace.slug) : Promise.resolve(null),
    ]);
    body = (
      <AcademyProfileForm
        initial={values}
        name={brand?.name ?? ws.workspace.name}
        logoUrl={brand?.logoUrl ?? null}
        teachers={(existing?.teachers ?? []).map((t) => ({ id: t.id, name: t.name, avatarUrl: t.avatarUrl, headline: t.headline }))}
        solo={ws.workspace.kind === "teacher"}
      />
    );
  }

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Academy profile</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">The page your students see about your academy: who you are, where you teach and where to find you online.</p>
      </header>
      {body}
    </main>
  );
}

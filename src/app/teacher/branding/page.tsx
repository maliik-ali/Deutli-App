import type { Metadata } from "next";

import { BrandingEditor } from "@/components/branding/branding-editor";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { logoPublicUrl } from "@/lib/branding/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const ws = user.role === "teacher" ? await getMyWorkspace(user.id) : null;
  const admin = createAdminClient();
  const { data: a } = ws && admin ? await admin.from("academies").select("display_name, logo_path, primary_color, accent_color, font_key").eq("id", ws.workspace.id).maybeSingle() : { data: null };

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Branding</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">Make Deutli look like your own school: your name, logo, colours and font.</p>
      </header>
      {!ws ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Branding belongs to a workspace. Teachers open it here; admins set up workspaces under Workspaces.</p>
      ) : ws.role === "teacher" ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Only the owner of {ws.workspace.name} can change the branding.</p>
      ) : (
        <BrandingEditor
          workspaceName={ws.workspace.name}
          features={ws.plan?.features ?? []}
          initial={{ displayName: a?.display_name ?? "", primary: a?.primary_color ?? "#7161ff", accent: a?.accent_color ?? "#cb3cff", fontKey: (a?.font_key as "inter" | "poppins" | "nunito" | null) ?? "default", logoUrl: logoPublicUrl(a?.logo_path ?? null) }}
        />
      )}
    </main>
  );
}

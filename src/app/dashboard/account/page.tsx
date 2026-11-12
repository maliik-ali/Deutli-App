import type { Metadata } from "next";

import { AccountSettings } from "@/components/account/account-settings";
import { getAvatarUrl } from "@/lib/account/avatar";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const supabase = await createClient();
  const [{ data: profile }, avatarUrl] = await Promise.all([
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    getAvatarUrl(user.avatarPath),
  ]);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Account</h1>
        <p className="text-[15px] text-muted-foreground">Your photo, name, contact details, password and languages.</p>
      </header>
      <div className="max-w-[960px]">
        <AccountSettings
          info={{
            fullName: user.fullName ?? "",
            email: user.email ?? "",
            phone: profile?.phone ?? "",
            languages: user.languages,
            avatarUrl,
          }}
        />
      </div>
    </main>
  );
}

import type { Metadata } from "next";

import { AccountSettings } from "@/components/account/account-settings";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle();

  return (
    <main className="mx-auto grid w-full max-w-[860px] gap-8 px-4 py-6 sm:px-6 md:px-8 md:py-10">
      <div className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Account</h1>
        <p className="text-muted-foreground">Your name, contact details, password and languages.</p>
      </div>
      <AccountSettings
        info={{
          fullName: user.fullName ?? "",
          email: user.email ?? "",
          phone: profile?.phone ?? "",
          languages: user.languages,
        }}
      />
    </main>
  );
}

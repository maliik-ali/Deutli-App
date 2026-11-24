import type { Metadata } from "next";

import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Advanced settings" };

export default async function TeacherSettingsPage() {
  await requireUser(["teacher", "academy_admin", "super_admin"]);
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Advanced settings</h1>
      </header>
      <div className="max-w-[960px]">
        <AppearanceSettings />
      </div>
    </main>
  );
}

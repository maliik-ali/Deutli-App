import type { Metadata } from "next";

import { ExamSettings } from "@/components/settings/exam-settings";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Advanced settings" };

export default async function AdvancedSettingsPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Advanced settings</h1>
        <p className="text-[15px] text-muted-foreground">Choose the exam and level you are preparing for.</p>
      </header>
      <div className="max-w-[960px]">
        <ExamSettings exam={user.exam} />
      </div>
    </main>
  );
}

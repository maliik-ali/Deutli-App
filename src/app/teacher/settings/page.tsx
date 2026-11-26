import type { Metadata } from "next";
import Link from "next/link";
import { Palette } from "lucide-react";

import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Advanced settings" };

export default async function TeacherSettingsPage() {
  await requireUser(["teacher", "academy_admin", "super_admin"]);
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Advanced settings</h1>
      </header>
      <div className="grid max-w-[960px] gap-6">
        <AppearanceSettings />
        <Card className="gap-5 p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
              <Palette className="size-5" aria-hidden />
            </span>
            <div className="grid gap-1">
              <CardTitle>Branding</CardTitle>
              <CardDescription>Your name, logo, colours and font on your students&apos; app and signup page. You can try it before choosing a plan.</CardDescription>
            </div>
          </div>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/teacher/branding">Open branding</Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

import { WorkspaceCard } from "@/components/academies/workspace-card";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatMinor, getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { SUPPORT, whatsappLink } from "@/lib/support/contact";

export const metadata: Metadata = { title: "Plan" };

export default async function TeacherPlanPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const workspace = user.role === "teacher" ? await getMyWorkspace(user.id) : null;

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Plan</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">Your workspace plan and how many students and teachers it includes.</p>
      </header>

      {workspace ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <WorkspaceCard
            data={{
              name: workspace.workspace.name,
              kind: workspace.workspace.kind,
              planName: workspace.plan?.name ?? "No plan",
              priceLabel: workspace.plan?.eur_cents ? `${formatMinor(workspace.plan.eur_cents, "EUR")} a month` : "Free plan",
              students: workspace.students,
              maxStudents: workspace.plan?.max_students ?? null,
              teachers: workspace.teachers,
              maxTeachers: workspace.plan?.max_teachers ?? null,
              discountPercent: workspace.workspace.discount_percent,
              discountUntil: workspace.workspace.discount_until,
              isOwner: workspace.role === "owner",
            }}
          />
          <Card className="content-start gap-4 p-5 sm:p-6">
            <div className="grid gap-1">
              <CardTitle>Need a bigger plan?</CardTitle>
              <CardDescription>More students, more teachers, your own colours or logo. Tell us what you need and we will set it up for you.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden /> WhatsApp us
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`mailto:${SUPPORT.email}`}>
                  <Mail aria-hidden /> Email us
                </a>
              </Button>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Or <Link href="/teacher/support" className="underline underline-offset-4 hover:text-foreground">send a message from Support</Link>.
            </p>
          </Card>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Plans belong to a teacher or school workspace. Admins manage them in the admin panel.</p>
      )}
    </main>
  );
}

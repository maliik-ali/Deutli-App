import { redirect } from "next/navigation";

import { BrandShell, PoweredByFooter } from "@/components/branding/brand-shell";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { NavLinks } from "@/components/dashboard/nav-links";
import { UserMenu } from "@/components/dashboard/user-menu";
import { getAvatarUrl } from "@/lib/account/avatar";
import { TimeZoneSync } from "@/components/account/time-zone-sync";
import { getBrandForUser } from "@/lib/branding/data";
import { hasTeacherTools } from "@/lib/students/teacher-tools";
import { SetupSidebarCard } from "@/components/teacher/setup-sidebar-card";
import { requireUser } from "@/lib/auth/dal";
import { getStudentSetup } from "@/lib/students/setup";
// import { myExamTitle } from "@/lib/exam/choice"; // MVP: switched off, B1 only

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Server-side check on every request: must be logged in. Students live here;
  // admins may also open it, to see the app as a student does (they get an "Admin panel" link in the user menu).
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  // New students answer a few questions first (asked once; they can skip them).
  if (user.role === "student" && !user.onboardedAt) redirect("/onboarding");
  const [brand, teacherTools, setup] = await Promise.all([
    getBrandForUser(user.id),
    user.role === "student" ? hasTeacherTools(user.id, user.teacherId) : Promise.resolve(true),
    user.role === "student" ? getStudentSetup(user.id) : Promise.resolve(undefined),
  ]);
  const name = user.fullName ?? "Student";
  const avatarUrl = await getAvatarUrl(user.avatarPath);
  // MVP: the menu always says "My Exam". Later: const examTitle = myExamTitle(user.exam); (follows the chosen exam level)
  const examTitle = undefined;
  const footer = <UserMenu name={name} email={user.email} avatarUrl={avatarUrl} isAdmin={user.role !== "student"} />;

  return (
    <BrandShell brand={brand ? { name: brand.name, logoUrl: brand.logoUrl, showPoweredBy: brand.showPoweredBy } : null} vars={brand?.vars ?? {}}>
    <div className="min-h-dvh md:grid md:grid-cols-[264px_minmax(0,1fr)]">
      {!user.timeZoneSaved && <TimeZoneSync />}
      <aside className="hidden border-r border-border bg-card md:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 px-4 py-6">
          <Logo href="/dashboard" className="px-2" />
          <div className="flex-1 overflow-y-auto">
            <NavLinks examTitle={examTitle} teacherTools={teacherTools} />
          </div>
          {setup && <SetupSidebarCard steps={setup} homePath="/dashboard" />}
          {footer}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-2 backdrop-blur md:hidden">
        <MobileNav footer={footer} examTitle={examTitle} teacherTools={teacherTools} setup={setup} />
        <Logo href="/dashboard" />
        <span className="size-11 shrink-0" aria-hidden />
      </header>

      <div className="flex min-w-0 flex-col overflow-x-clip">
        <div className="min-w-0">{children}</div>
        <PoweredByFooter />
      </div>
    </div>
    </BrandShell>
  );
}

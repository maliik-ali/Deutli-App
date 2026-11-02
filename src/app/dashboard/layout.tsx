import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { NavLinks } from "@/components/dashboard/nav-links";
import { UserFooter } from "@/components/dashboard/user-footer";
import { requireUser } from "@/lib/auth/dal";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Server-side check on every request: must be logged in and a student.
  const user = await requireUser(["student"]);
  const name = user.fullName ?? "Student";
  const footer = <UserFooter name={name} email={user.email} />;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card md:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 px-4 py-6">
          <Logo href="/dashboard" className="px-2" />
          <div className="flex-1 overflow-y-auto">
            <NavLinks />
          </div>
          {footer}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-2 backdrop-blur md:hidden">
        <MobileNav footer={footer} />
        <Logo href="/dashboard" />
        <span className="size-11" aria-hidden />
      </header>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

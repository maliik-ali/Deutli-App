"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardCheck, FileText, GraduationCap, Layers, FolderOpen, LayoutDashboard, Palette, Menu, PenLine, ShieldCheck, Users, Video } from "lucide-react";

import { TEACHER_MENU, UserMenu } from "@/components/dashboard/user-menu";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SetupSidebarCard } from "@/components/teacher/setup-sidebar-card";
import type { SetupStep } from "@/lib/setup-step";
import { cn } from "@/lib/utils";

/** In the order a teacher works: set up a batch, add students, teach, then review. */
const ITEMS = [
  { href: "/teacher", label: "Overview", icon: LayoutDashboard },
  { href: "/teacher/batches", label: "Batches", icon: Layers },
  { href: "/teacher/students", label: "My students", icon: Users },
  { href: "/teacher/classes", label: "My classes", icon: Video },
  { href: "/teacher/materials", label: "Material", icon: FolderOpen },
  { href: "/teacher/tests", label: "Chapter tests", icon: ClipboardCheck },
  { href: "/teacher/papers", label: "My papers", icon: FileText },
  { href: "/teacher/lessons", label: "1:1 lessons", icon: GraduationCap },
  { href: "/teacher/reviews", label: "Writing reviews", icon: PenLine, badge: true },
  { href: "/teacher/branding", label: "Branding", icon: Palette },
] as const;

function Links({ todo, isAdmin, showSchool, onNavigate }: { todo: number; isAdmin: boolean; showSchool?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const cls = (active: boolean) =>
    cn(
      "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors",
      active ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );
  return (
    <nav aria-label="Teacher">
      <ul className="grid gap-1">
        {[...ITEMS, ...(showSchool ? [{ href: "/teacher/school", label: "My school", icon: Building2 } as const] : [])].map(({ href, label, icon: Icon, ...rest }) => {
          const active = href === "/teacher" ? pathname === href : pathname.startsWith(href) || (href === "/teacher/reviews" && pathname.startsWith("/teacher/review/"));
          return (
            <li key={href}>
              <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cls(active)}>
                <Icon className={cn("size-[18px]", active && "text-gold-ink")} aria-hidden />
                <span className="flex-1">{label}</span>
                {"badge" in rest && todo > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-ink-foreground">
                    {todo}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {isAdmin && (
          <li>
            <Link href="/admin" onClick={onNavigate} className={cls(false)}>
              <ShieldCheck className="size-[18px]" aria-hidden />
              Admin panel
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

type Props = { todo: number; isAdmin: boolean; showSchool?: boolean; name: string; email: string | null; avatarUrl: string | null; setup?: SetupStep[] };

export function TeacherSidebar(p: Props) {
  return (
    <div className="sticky top-0 flex h-dvh flex-col gap-8 px-4 py-6">
      <Logo href="/teacher" className="px-2" />
      <div className="flex-1 overflow-y-auto">
        <Links todo={p.todo} isAdmin={p.isAdmin} showSchool={p.showSchool} />
      </div>
      {p.setup && <SetupSidebarCard steps={p.setup} />}
      <UserMenu name={p.name} email={p.email} avatarUrl={p.avatarUrl} items={TEACHER_MENU} />
    </div>
  );
}

export function TeacherMobileNav(p: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-6 p-4 pt-5">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Teacher navigation</SheetDescription>
        <Logo href="/teacher" className="px-2" />
        <div className="flex-1 overflow-y-auto">
          <Links todo={p.todo} isAdmin={p.isAdmin} showSchool={p.showSchool} onNavigate={() => setOpen(false)} />
        </div>
        {p.setup && <SetupSidebarCard steps={p.setup} onNavigate={() => setOpen(false)} />}
        <UserMenu name={p.name} email={p.email} avatarUrl={p.avatarUrl} items={TEACHER_MENU} />
      </SheetContent>
    </Sheet>
  );
}

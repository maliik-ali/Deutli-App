"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, PenLine, ShieldCheck, UserRound, Users, Video } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/teacher", label: "Overview", icon: LayoutDashboard },
  { href: "/teacher/reviews", label: "Writing reviews", icon: PenLine, badge: true },
  { href: "/teacher/students", label: "My students", icon: Users },
  { href: "/teacher/classes", label: "My classes", icon: Video },
  { href: "/teacher/profile", label: "My profile", icon: UserRound },
] as const;

function Links({ todo, isAdmin, onNavigate }: { todo: number; isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const cls = (active: boolean) =>
    cn(
      "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors",
      active ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );
  return (
    <nav aria-label="Teacher">
      <ul className="grid gap-1">
        {ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
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

function Footer({ name, email, avatarUrl }: { name: string; email: string | null; avatarUrl: string | null }) {
  return (
    <div className="grid gap-2 border-t border-border pt-4">
      <div className="flex items-center gap-3 px-2">
        <Avatar name={name} url={avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name}</span>
          {email && <span className="block truncate text-[13px] text-subtle-foreground">{email}</span>}
        </span>
      </div>
      <form action={signOut}>
        <button type="submit" className="flex h-11 w-full items-center gap-3 rounded-full px-4 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <LogOut className="size-[18px]" aria-hidden /> Log out
        </button>
      </form>
    </div>
  );
}

type Props = { todo: number; isAdmin: boolean; name: string; email: string | null; avatarUrl: string | null };

export function TeacherSidebar(p: Props) {
  return (
    <div className="sticky top-0 flex h-dvh flex-col gap-8 px-4 py-6">
      <Logo href="/teacher" className="px-2" />
      <div className="flex-1 overflow-y-auto">
        <Links todo={p.todo} isAdmin={p.isAdmin} />
      </div>
      <Footer name={p.name} email={p.email} avatarUrl={p.avatarUrl} />
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
          <Links todo={p.todo} isAdmin={p.isAdmin} onNavigate={() => setOpen(false)} />
        </div>
        <Footer name={p.name} email={p.email} avatarUrl={p.avatarUrl} />
      </SheetContent>
    </Sheet>
  );
}

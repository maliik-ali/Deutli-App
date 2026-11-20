"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, LogOut, Menu } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ADMIN_ITEMS } from "./admin-items";

const linkClass = (active: boolean) =>
  cn(
    "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors",
    active ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

function Links({ newFeedback, onNavigate }: { newFeedback: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="grid gap-4">
      <ul className="grid gap-1">
        {ADMIN_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                <Icon className={cn("size-[18px]", active && "text-gold-ink")} aria-hidden />
                <span className="flex-1">{label}</span>
                {badge === "feedback" && newFeedback > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-ink-foreground">
                    {newFeedback}
                    <span className="sr-only"> new</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* See the app the way a student does. */}
      <div className="border-t border-border pt-4">
        <Link href="/dashboard" onClick={onNavigate} className={linkClass(false)}>
          <Eye className="size-[18px]" aria-hidden />
          <span className="flex-1">Student view</span>
        </Link>
      </div>
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

type Props = { newFeedback: number; name: string; email: string | null; avatarUrl: string | null };

export function AdminSidebar(p: Props) {
  return (
    <div className="sticky top-0 flex h-dvh flex-col gap-8 px-4 py-6">
      <Logo href="/admin" className="px-2" />
      <div className="flex-1 overflow-y-auto">
        <Links newFeedback={p.newFeedback} />
      </div>
      <Footer name={p.name} email={p.email} avatarUrl={p.avatarUrl} />
    </div>
  );
}

export function AdminMobileNav(p: Props) {
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
        <SheetDescription className="sr-only">Admin navigation</SheetDescription>
        <Logo href="/admin" className="px-2" />
        <div className="flex-1 overflow-y-auto">
          <Links newFeedback={p.newFeedback} onNavigate={() => setOpen(false)} />
        </div>
        <Footer name={p.name} email={p.email} avatarUrl={p.avatarUrl} />
      </SheetContent>
    </Sheet>
  );
}

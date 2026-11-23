"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Menu } from "lucide-react";

import { ADMIN_MENU, UserMenu } from "@/components/dashboard/user-menu";
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

type Props = { newFeedback: number; name: string; email: string | null; avatarUrl: string | null };

export function AdminSidebar(p: Props) {
  return (
    <div className="sticky top-0 flex h-dvh flex-col gap-8 px-4 py-6">
      <Logo href="/admin" className="px-2" />
      <div className="flex-1 overflow-y-auto">
        <Links newFeedback={p.newFeedback} />
      </div>
      <UserMenu name={p.name} email={p.email} avatarUrl={p.avatarUrl} items={ADMIN_MENU} />
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
        <UserMenu name={p.name} email={p.email} avatarUrl={p.avatarUrl} items={ADMIN_MENU} />
      </SheetContent>
    </Sheet>
  );
}

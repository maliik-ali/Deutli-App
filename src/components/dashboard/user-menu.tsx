"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, IdCard, LifeBuoy, LogOut, ShieldCheck, SlidersHorizontal, Sparkles, UserRound, type LucideIcon } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";

export type UserMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** "prefix" also counts sub-pages (e.g. /dashboard/upgrade/checkout) as this item. */
  match?: "exact" | "prefix";
};

/** What a student sees. */
export const STUDENT_MENU: UserMenuItem[] = [
  { href: "/dashboard/account", label: "Account", icon: UserRound },
  { href: "/dashboard/settings", label: "Advanced settings", icon: SlidersHorizontal },
  { href: "/dashboard/upgrade", label: "Plans", icon: Sparkles, match: "prefix" },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
];

/** What a teacher sees. */
export const TEACHER_MENU: UserMenuItem[] = [
  { href: "/teacher/profile", label: "My profile", icon: IdCard },
  { href: "/teacher/account", label: "Account", icon: UserRound },
  { href: "/teacher/settings", label: "Advanced settings", icon: SlidersHorizontal },
];

/** What an admin sees (the way back to the admin panel is not needed here). */
export const ADMIN_MENU: UserMenuItem[] = [
  { href: "/admin/account", label: "Account", icon: UserRound },
  { href: "/dashboard", label: "Student view", icon: Sparkles },
];

type Props = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  /** The links in the menu (default: the student menu). */
  items?: UserMenuItem[];
  /** Adds a way back to the admin panel (admins looking at the student app). */
  isAdmin?: boolean;
};

/** Name card at the bottom of every sidebar. Opens a small menu with the role's links and Log out. */
export function UserMenu({ name, email, avatarUrl, items = STUDENT_MENU, isAdmin = false }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const isActive = (i: UserMenuItem) => (i.match === "prefix" ? pathname.startsWith(i.href) : pathname === i.href);
  const onAny = items.some(isActive);

  // Close on Escape or a click outside.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const itemClass =
    "flex h-11 w-full items-center gap-3 rounded-full px-4 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div ref={rootRef} className="relative border-t border-border pt-4">
      {open && (
        <div
          id={menuId}
          className="absolute inset-x-0 bottom-full mb-2 grid gap-1 rounded-2xl border border-border bg-ink p-2 shadow-lg shadow-black/40"
        >
          <div className="px-3 pt-1 pb-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            {email && <p className="truncate text-[13px] text-subtle-foreground">{email}</p>}
          </div>
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(itemClass, active && "bg-gold-soft font-semibold text-foreground")}
              >
                <item.icon className={cn("size-[18px]", active && "text-gold-ink")} aria-hidden /> {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className={itemClass}>
              <ShieldCheck className="size-[18px]" aria-hidden /> Admin panel
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className={itemClass}>
              <LogOut className="size-[18px]" aria-hidden /> Log out
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-muted",
          (open || onAny) && "bg-muted",
        )}
      >
        <Avatar name={name} url={avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name}</span>
          {email && <span className="block truncate text-[13px] text-subtle-foreground">{email}</span>}
        </span>
        <ChevronUp
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "rotate-180")}
          aria-hidden
        />
        <span className="sr-only">Account menu</span>
      </button>
    </div>
  );
}

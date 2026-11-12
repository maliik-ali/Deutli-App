"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, LogOut, UserRound } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "S"
  );
}

/** Name card at the bottom of the sidebar. Opens a small menu: Account, Log out. */
export function UserMenu({ name, email }: { name: string; email: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const onAccount = pathname === "/dashboard/account";

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
          <Link
            href="/dashboard/account"
            onClick={() => setOpen(false)}
            aria-current={onAccount ? "page" : undefined}
            className={cn(itemClass, onAccount && "bg-gold-soft font-semibold text-foreground")}
          >
            <UserRound className={cn("size-[18px]", onAccount && "text-gold-ink")} aria-hidden /> Account
          </Link>
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
          (open || onAccount) && "bg-muted",
        )}
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-ink font-heading text-[13px] font-bold text-ink-foreground"
          aria-hidden
        >
          {initialsOf(name)}
        </span>
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

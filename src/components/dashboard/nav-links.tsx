"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ChevronDown,
  Headphones,
  Home,
  Languages,
  MessageCircleQuestion,
  Mic,
  PenLine,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { NAV_ITEMS, type NavIcon } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  book: BookOpen,
  headphones: Headphones,
  pen: PenLine,
  timer: Timer,
  languages: Languages,
  mic: Mic,
  message: MessageCircleQuestion,
  award: Award,
};

type Item = (typeof NAV_ITEMS)[number];
type Child = { href: string; label: string };

const linkClass = (active: boolean) =>
  cn(
    "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors",
    active ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="grid gap-1">
        {NAV_ITEMS.map((item) =>
          "children" in item ? (
            <NavGroup key={item.href} item={item} items={item.children} pathname={pathname} onNavigate={onNavigate} />
          ) : (
            <li key={item.href}>
              <NavLink item={item} active={pathname === item.href} onNavigate={onNavigate} />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function NavLink({ item, active, onNavigate }: { item: Item; active: boolean; onNavigate?: () => void }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(linkClass(active), "children" in item && "pr-12")}
    >
      <Icon className={cn("size-[18px]", active && "text-gold-ink")} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {"count" in item && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-ink-foreground">
          {item.count}
          <span className="sr-only"> new</span>
        </span>
      )}
    </Link>
  );
}

/** A menu item with a sub-menu: opens by itself when you are inside that section. */
function NavGroup({
  item,
  items,
  pathname,
  onNavigate,
}: {
  item: Item;
  items: readonly Child[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const inside = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const [open, setOpen] = useState(inside);
  const childActive = items.some((c) => c.href === pathname);
  const listId = `nav-${item.href.split("/").pop()}`;
  return (
    <li>
      <div className="relative">
        <NavLink item={item} active={inside && !childActive} onNavigate={onNavigate} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open || inside}
          aria-controls={listId}
          aria-label={`${open || inside ? "Hide" : "Show"} ${item.label} sections`}
          className="absolute top-0 right-0 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={cn("size-4 transition-transform", (open || inside) && "rotate-180")} aria-hidden />
        </button>
      </div>
      {(open || inside) && (
        <ul id={listId} className="mt-1 ml-[25px] grid gap-0.5 border-l border-border pl-3">
          {items.map((c) => {
            const active = c.href === pathname;
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center rounded-full px-4 text-[14px] font-medium transition-colors",
                    active ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

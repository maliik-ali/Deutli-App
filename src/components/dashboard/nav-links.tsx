"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
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

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="grid gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors",
                  active
                    ? "bg-gold-soft font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
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
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

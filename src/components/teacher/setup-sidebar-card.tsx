"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Sprout } from "lucide-react";

import { isHidden, subscribe } from "@/components/getting-started";
import type { SetupStep } from "@/lib/setup-step";
import { cn } from "@/lib/utils";

/**
 * Small "Get started" reminder in the sidebar, so a new teacher always sees the next step on every screen.
 * The full checklist stays on the Overview page, so this hides there, once everything is done, or when hidden.
 */
export function SetupSidebarCard({ steps, onNavigate }: { steps: SetupStep[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const hidden = useSyncExternalStore(subscribe, isHidden, () => false);
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  if (!next || hidden || pathname === "/teacher") return null;

  return (
    <Link
      href={next.href}
      onClick={onNavigate}
      className="group grid gap-2.5 rounded-2xl border border-border bg-muted/50 p-3.5 transition-colors hover:bg-muted"
    >
      <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Sprout className="size-4 text-success" aria-hidden /> Get started</span>
        <span className="tabular-nums">{done}/{steps.length}</span>
      </span>
      <span aria-hidden className="flex h-1.5 gap-1">
        {steps.map((s) => <span key={s.key} className={cn("h-full flex-1 rounded-full", s.done ? "bg-brand-gradient" : "bg-border")} />)}
      </span>
      <span className="flex items-center gap-2">
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-[12px] text-muted-foreground">Next step</span>
          <span className="text-[14px] leading-snug font-bold">{next.title}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

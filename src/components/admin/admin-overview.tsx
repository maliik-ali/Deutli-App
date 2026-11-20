import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";

import { ADMIN_ITEMS } from "@/components/admin/admin-items";
import { Button } from "@/components/ui/button";

/** What each admin area is for, shown as cards on the overview. */
const ABOUT: Record<string, string> = {
  "/admin/mock-papers": "Upload real exam papers with audio and answer keys for students to solve online.",
  "/admin/daily-practice": "Add texts and audio for students to listen, read and speak along.",
  "/admin/dictionary": "Upload word lists with meanings. Students get them free when they save a word.",
  "/admin/classes": "See every class, add classes for teachers, and check who registered.",
  "/admin/teachers": "Make someone a teacher and give students their teacher. Teachers check their students' writing.",
  "/admin/payments": "Set Pro plans and payment accounts. Check payments and turn Pro on.",
  "/admin/pro-requests": "Students who asked for Deutli Pro. Contact them with the price.",
  "/admin/feedback": "Messages from students: problems, payment questions and ideas.",
};

/** Start page of the admin area: the same areas as the menu, as cards. */
export function AdminOverview({ name, roleLabel, newFeedback }: { name: string; roleLabel: string; newFeedback: number }) {
  const areas = ADMIN_ITEMS.filter((i) => i.href !== "/admin");
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <p className="text-sm font-medium text-muted-foreground">Hello {name}</p>
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{roleLabel}</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <Eye aria-hidden /> View the student side
          </Link>
        </Button>
      </header>

      <ul className="grid gap-4 md:grid-cols-2">
        {areas.map(({ href, label, icon: Icon, badge }) => (
          <li key={href}>
            <Link href={href} className="flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="grid flex-1 gap-0.5">
                <span className="text-base font-bold">
                  {label}
                  {badge === "feedback" && newFeedback > 0 ? <span className="ml-2 rounded-full bg-brand-gradient px-2 py-0.5 text-xs font-bold text-white">{newFeedback} new</span> : null}
                </span>
                <span className="text-sm text-muted-foreground">{ABOUT[href]}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

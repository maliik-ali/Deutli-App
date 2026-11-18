import type { Metadata } from "next";

import Link from "next/link";
import { ArrowRight, BookA, FileText, Headphones, Sparkles, UserCheck, Video, Wallet } from "lucide-react";

import { RolePlaceholder } from "@/components/role-placeholder";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireUser(["academy_admin", "super_admin"]);
  return (
    <RolePlaceholder
      title={user.role === "super_admin" ? "Platform admin" : "Academy admin"}
      name={user.fullName ?? "there"}
      body="Students, batches, timetable, attendance and fees will be managed here."
    >
      <Link
        href="/admin/daily-practice"
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <Headphones className="size-6" aria-hidden />
        </span>
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-bold">Daily Practice texts</span>
          <span className="text-sm text-muted-foreground">
            Add texts and audio for students to listen, read and speak along.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        href="/admin/classes"
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <Video className="size-6" aria-hidden />
        </span>
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-bold">Live classes</span>
          <span className="text-sm text-muted-foreground">
            See every class, add classes for teachers, and check who registered.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        href="/admin/dictionary"
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <BookA className="size-6" aria-hidden />
        </span>
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-bold">Word dictionary</span>
          <span className="text-sm text-muted-foreground">
            Upload word lists with meanings. Students get them free when they save a word.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        href="/admin/mock-papers"
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <FileText className="size-6" aria-hidden />
        </span>
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-bold">Mock exam papers</span>
          <span className="text-sm text-muted-foreground">
            Upload real exam papers with audio and answer keys for students to solve online.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        href="/admin/teachers"
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <UserCheck className="size-6" aria-hidden />
        </span>
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-bold">Teachers and students</span>
          <span className="text-sm text-muted-foreground">
            Make someone a teacher and give students their teacher. Teachers check their students&apos; writing.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        href="/admin/payments"
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <Wallet className="size-6" aria-hidden />
        </span>
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-bold">Payments</span>
          <span className="text-sm text-muted-foreground">Set Pro plans and payment accounts. Check payments and turn Pro on.</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        href="/admin/pro-requests"
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-bold">Pro requests</span>
          <span className="text-sm text-muted-foreground">Students who asked for Deutli Pro. Contact them with the price.</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </RolePlaceholder>
  );
}

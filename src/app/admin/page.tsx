import type { Metadata } from "next";

import Link from "next/link";
import { ArrowRight, BookA, Headphones } from "lucide-react";

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
    </RolePlaceholder>
  );
}

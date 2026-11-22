import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { TestBuilder } from "@/components/tests/test-builder";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { listTeacherBatches } from "@/lib/batches/data";

export const metadata: Metadata = { title: "New test" };

export default async function NewTestPage() {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const batches = ws ? (await listTeacherBatches(user.id, ws.workspace.id, false)).filter((b) => !b.archived) : [];
  return (
    <main className="mx-auto grid max-w-[860px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/teacher/tests" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" aria-hidden /> Chapter tests</Link>
      <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">New test</h1>
      <TestBuilder batches={batches.map((b) => ({ id: b.id, name: b.name }))} />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ClassForm } from "@/components/classes/class-form";
import { requireUser } from "@/lib/auth/dal";
import { listCourseTitles } from "@/lib/classes/data";
import { blankClass } from "@/lib/classes/form";

export const metadata: Metadata = { title: "New class" };

export default async function NewClassPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const suggestions = await listCourseTitles(user.id);
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="grid gap-2">
        <Link href="/teacher/classes" className="inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> My classes
        </Link>
        <h1 className="text-3xl font-extrabold">New class</h1>
      </div>
      <div className="max-w-[760px]">
        <ClassForm initial={blankClass(user.timeZone, user.id)} mode="create" courseSuggestions={suggestions} timeZone={user.timeZone} doneHref="/teacher/classes" />
      </div>
    </main>
  );
}

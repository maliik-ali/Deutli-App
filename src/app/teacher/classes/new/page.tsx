import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ClassForm } from "@/components/classes/class-form";
import { requireUser } from "@/lib/auth/dal";
import { getDefaultRoom, listCourseTitles } from "@/lib/classes/data";
import { blankClass } from "@/lib/classes/form";

export const metadata: Metadata = { title: "New class" };

export default async function NewClassPage(props: PageProps<"/teacher/classes/new">) {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const batchId = typeof sp.batch === "string" && /^[0-9a-f-]{36}$/i.test(sp.batch) ? sp.batch : undefined;
  const [suggestions, room] = await Promise.all([listCourseTitles(user.id), user.role === "teacher" ? getDefaultRoom(user.id) : Promise.resolve(null)]);
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="grid gap-2">
        <Link href="/teacher/classes" className="inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> My classes
        </Link>
        <h1 className="text-3xl font-extrabold">New class</h1>
      </div>
      <div className="max-w-[760px]">
        <ClassForm initial={{ ...blankClass(user.timeZone, user.id), batchId, joinUrl: room?.joinUrl ?? "", passcode: room?.passcode ?? "" }} mode="create" courseSuggestions={suggestions} timeZone={user.timeZone} doneHref={batchId ? `/teacher/batches/${batchId}` : "/teacher/classes"} />
      </div>
    </main>
  );
}

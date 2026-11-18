import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ClassEditor } from "@/components/classes/class-editor";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Class" };

export default async function EditClassPage(props: PageProps<"/teacher/classes/[id]">) {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const { id } = await props.params;
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="grid gap-2">
        <Link href="/teacher/classes" className="inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> My classes
        </Link>
        <h1 className="text-3xl font-extrabold">Edit class</h1>
      </div>
      <div className="max-w-[1100px]">
        <ClassEditor id={id} viewer={user} doneHref="/teacher/classes" />
      </div>
    </main>
  );
}

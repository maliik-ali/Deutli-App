import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { ClassForm } from "@/components/classes/class-form";
import { requireUser } from "@/lib/auth/dal";
import { listCourseTitles, listTeacherOptions } from "@/lib/classes/data";
import { blankClass } from "@/lib/classes/form";

export const metadata: Metadata = { title: "New class" };

export default async function AdminNewClassPage() {
  const user = await requireUser(["academy_admin", "super_admin"]);
  const [teachers, suggestions] = await Promise.all([listTeacherOptions(), listCourseTitles(null)]);
  return (
    <AdminShell title="New class" back={{ href: "/admin/classes", label: "Live classes" }}>
      {teachers.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-5 py-4 text-muted-foreground">
          There are no teachers yet. Make someone a teacher in Teachers and students first.
        </p>
      ) : (
        <ClassForm
          initial={blankClass(user.timeZone, "")}
          mode="create"
          teachers={teachers}
          courseSuggestions={suggestions}
          timeZone={user.timeZone}
          doneHref="/admin/classes"
        />
      )}
    </AdminShell>
  );
}

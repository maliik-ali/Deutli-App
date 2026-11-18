import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { ClassEditor } from "@/components/classes/class-editor";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Class" };

export default async function AdminEditClassPage(props: PageProps<"/admin/classes/[id]">) {
  const user = await requireUser(["academy_admin", "super_admin"]);
  const { id } = await props.params;
  return (
    <AdminShell title="Edit class" back={{ href: "/admin/classes", label: "Live classes" }}>
      <ClassEditor id={id} viewer={user} doneHref="/admin/classes" />
    </AdminShell>
  );
}

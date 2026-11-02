import type { Metadata } from "next";

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
    />
  );
}

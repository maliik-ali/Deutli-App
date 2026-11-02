import type { Metadata } from "next";

import { RolePlaceholder } from "@/components/role-placeholder";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Teacher" };

export default async function TeacherPage() {
  const user = await requireUser(["teacher"]);
  return (
    <RolePlaceholder
      title="Teacher workspace"
      name={user.fullName ?? "there"}
      body="Your review queue for homework and writing will appear here: AI estimates to confirm or override, and your batches."
    />
  );
}

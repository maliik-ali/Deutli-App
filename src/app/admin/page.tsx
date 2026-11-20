import type { Metadata } from "next";

import { AdminOverview } from "@/components/admin/admin-overview";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireUser(["academy_admin", "super_admin"]);
  const { count } = (await createAdminClient()?.from("feedback").select("id", { count: "exact", head: true }).eq("status", "new")) ?? { count: 0 };
  return <AdminOverview name={user.fullName ?? "there"} roleLabel={user.role === "super_admin" ? "Platform admin" : "Academy admin"} newFeedback={count ?? 0} />;
}

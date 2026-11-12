import type { Metadata } from "next";

import { PracticeOverview } from "@/components/practice/overview";
import { requireUser } from "@/lib/auth/dal";
import { getPracticeSets } from "@/lib/practice/data";
import { todayPKT } from "@/lib/practice/plan";

export const metadata: Metadata = { title: "Daily Practice" };

export default async function DailyPracticePage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const { sets, failed } = await getPracticeSets(user.id);
  return (
    <PracticeOverview sets={sets} today={todayPKT()} failed={failed} canManage={user.role !== "student"} />
  );
}

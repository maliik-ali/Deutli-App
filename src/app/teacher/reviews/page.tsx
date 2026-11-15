import type { Metadata } from "next";

import { CheckedCard, OpenRequestsCard, ToCheckCard } from "@/components/teacher/review-lists";
import { requireUser } from "@/lib/auth/dal";
import { getTeacherData } from "@/lib/teachers/data";

export const metadata: Metadata = { title: "Writing reviews" };

export default async function ReviewsPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const data = await getTeacherData(user.id, user.role !== "teacher");
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-3xl font-extrabold">Writing reviews</h1>
        <p className="text-muted-foreground">Check your students&apos; emails. Your score is the final one.</p>
      </div>
      <ToCheckCard rows={data.mine.filter((r) => r.status === "requested")} names={data.names} />
      <OpenRequestsCard rows={data.open} names={data.names} />
      <CheckedCard rows={data.mine.filter((r) => r.status === "done")} names={data.names} />
    </main>
  );
}

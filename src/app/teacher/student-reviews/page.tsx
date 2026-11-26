import type { Metadata } from "next";

import { ReplyForm } from "@/components/reviews/reply-form";
import { ReviewItem } from "@/components/reviews/review-item";
import { TeacherBadges } from "@/components/reputation/teacher-badges";
import { Stars } from "@/components/reviews/stars";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { earnedBadges, nextBadgeHint } from "@/lib/reputation/badges";
import { getTeacherStats } from "@/lib/reputation/data";
import { MIN_DAYS_IN_BATCH, MIN_REVIEWS_FOR_AVERAGE } from "@/lib/reviews/constants";
import { listReviewsForTeacher } from "@/lib/reviews/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Student reviews" };

export default async function StudentReviewsPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const admin = createAdminClient();
  const reviews = user.role === "teacher" && admin ? await listReviewsForTeacher(admin, user.id) : [];
  const shown = reviews.filter((r) => !r.hidden);
  const average = shown.length ? shown.reduce((a, r) => a + r.rating, 0) / shown.length : 0;
  const unanswered = shown.filter((r) => !r.reply).length;
  const stats = user.role === "teacher" && admin ? (await getTeacherStats(admin, [user.id])).get(user.id)! : null;
  const badges = stats ? earnedBadges(stats) : [];
  const hint = stats ? nextBadgeHint(stats) : null;

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Student reviews</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          What your students say about you. Only students who studied with you can write one: {MIN_DAYS_IN_BATCH} days in your batch, or a class they attended. Answer them, it shows you care.
        </p>
      </header>

      {user.role === "teacher" && (
        <Card className="max-w-[760px] gap-3 p-5">
          <p className="font-semibold">Your badges</p>
          {badges.length > 0 ? <TeacherBadges badges={badges} explain /> : <p className="text-[14px] text-muted-foreground">No badges yet. They come from real reviews and classes, nobody can buy them.</p>}
          {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
        </Card>
      )}

      {user.role !== "teacher" ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Reviews belong to teachers. Admins moderate them under Reviews in the admin panel.</p>
      ) : reviews.length === 0 ? (
        <Card className="max-w-[760px] gap-2 p-6">
          <p className="font-semibold">No reviews yet</p>
          <p className="text-[14px] text-muted-foreground">Students can review you once they have been in your batch for {MIN_DAYS_IN_BATCH} days or attended one of your classes. They will find the form on your profile page.</p>
        </Card>
      ) : (
        <div className="grid max-w-[760px] gap-6">
          <Card className="gap-1 p-5">
            {shown.length >= MIN_REVIEWS_FOR_AVERAGE ? (
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-3xl font-extrabold tabular-nums">{average.toFixed(1)}</span>
                <Stars value={average} />
                <span className="text-muted-foreground">{shown.length} reviews</span>
              </p>
            ) : (
              <p className="text-[15px]">{shown.length} review{shown.length === 1 ? "" : "s"}. Your average shows to students from {MIN_REVIEWS_FOR_AVERAGE} reviews.</p>
            )}
            {unanswered > 0 && <p className="text-[13px] text-muted-foreground">{unanswered} waiting for your reply.</p>}
          </Card>
          <Card>
            <ul className="divide-y divide-border">
              {reviews.map((r) => (
                <ReviewItem
                  key={r.id}
                  review={r}
                  actions={
                    r.hidden ? (
                      <p className="text-[13px] text-muted-foreground">Deutli has hidden this review. Students cannot see it.</p>
                    ) : (
                      <div>
                        <ReplyForm reviewId={r.id} initial={r.reply} />
                      </div>
                    )
                  }
                />
              ))}
            </ul>
          </Card>
        </div>
      )}
    </main>
  );
}

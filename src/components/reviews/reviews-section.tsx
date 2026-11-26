import { ReportButton } from "@/components/reviews/report-button";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewItem } from "@/components/reviews/review-item";
import { Stars } from "@/components/reviews/stars";
import { Card } from "@/components/ui/card";
import type { CurrentUser } from "@/lib/auth/dal";
import { MIN_DAYS_IN_BATCH, MIN_REVIEWS_FOR_AVERAGE } from "@/lib/reviews/constants";
import { getEligibility, getMyReview, getReviewSummary, listPublishedReviews, type ReviewFilter } from "@/lib/reviews/data";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

function Summary({ average, count }: { average: number; count: number }) {
  if (count === 0) return null;
  return count >= MIN_REVIEWS_FOR_AVERAGE ? (
    <p className="flex items-center gap-2 text-[15px]">
      <span className="text-2xl font-extrabold tabular-nums">{average.toFixed(1)}</span>
      <Stars value={average} />
      <span className="text-muted-foreground">
        {count} reviews
      </span>
    </p>
  ) : (
    <p className="text-[14px] text-muted-foreground">
      {count} review{count === 1 ? "" : "s"}. The average shows from {MIN_REVIEWS_FOR_AVERAGE} reviews.
    </p>
  );
}

/** Reviews of a teacher, on their profile. A verified student also sees the form to write or edit their own. */
export async function TeacherReviews({ admin, teacherId, firstName, viewer }: { admin: Admin; teacherId: string; firstName: string; viewer: CurrentUser }) {
  const filter: ReviewFilter = { teacherId };
  const [reviews, summary] = await Promise.all([listPublishedReviews(admin, filter, 30), getReviewSummary(admin, filter)]);
  const isStudent = viewer.role === "student";
  const [eligible, mine] = isStudent ? await Promise.all([getEligibility(admin, viewer.id, teacherId), getMyReview(admin, viewer.id, teacherId)]) : [null, null];

  return (
    <section className="grid gap-4" aria-labelledby="reviews">
      <div className="grid gap-1">
        <h2 id="reviews" className="text-xl font-bold">
          Reviews
        </h2>
        <Summary {...summary} />
      </div>

      {isStudent && (eligible?.ok || mine) ? (
        <ReviewForm teacherId={teacherId} firstName={firstName} initial={mine} />
      ) : isStudent ? (
        <p className="text-[14px] text-muted-foreground">Reviews come from students who studied with {firstName}: {MIN_DAYS_IN_BATCH} days in their batch, or a class attended.</p>
      ) : null}

      {reviews.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">No reviews yet.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} actions={mine?.id === r.id ? <p className="text-[13px] text-muted-foreground">This is your review.</p> : <ReportButton reviewId={r.id} />} />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

/** Reviews of everyone at an academy (read only; writing happens on the teacher's page). */
export async function AcademyReviews({ admin, academyId }: { admin: Admin; academyId: string }) {
  const filter: ReviewFilter = { academyId };
  const [reviews, summary] = await Promise.all([listPublishedReviews(admin, filter, 10), getReviewSummary(admin, filter)]);
  if (reviews.length === 0) return null;
  return (
    <section className="grid gap-4" aria-labelledby="academy-reviews">
      <div className="grid gap-1">
        <h2 id="academy-reviews" className="text-xl font-bold">
          Reviews
        </h2>
        <Summary {...summary} />
      </div>
      <Card>
        <ul className="divide-y divide-border">
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} showTeacher actions={<ReportButton reviewId={r.id} />} />
          ))}
        </ul>
      </Card>
    </section>
  );
}

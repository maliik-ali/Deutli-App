import { Stars } from "@/components/reviews/stars";
import { Badge } from "@/components/ui/badge";
import { helpedLabel, type ReviewView } from "@/lib/reviews/data";

const month = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

/** One review: stars, who and when, what helped, the words, and the teacher's reply. `actions` goes at the bottom. */
export function ReviewItem({ review, showTeacher, actions }: { review: ReviewView; showTeacher?: boolean; actions?: React.ReactNode }) {
  return (
    <li className="grid gap-2.5 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={review.rating} />
        <span className="text-[14px] font-semibold">{review.name}</span>
        <span className="text-[13px] text-muted-foreground">{month(review.createdAt)}{showTeacher ? ` · about ${review.teacherName}` : ""}</span>
      </div>
      {review.helped.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="What helped">
          {review.helped.map((h) => (
            <li key={h}>
              <Badge variant="outline">{helpedLabel(h)}</Badge>
            </li>
          ))}
        </ul>
      )}
      {review.body && <p className="max-w-2xl text-[15px] leading-relaxed whitespace-pre-line">{review.body}</p>}
      {review.reply && (
        <div className="max-w-2xl rounded-xl bg-muted/60 px-4 py-3">
          <p className="mb-0.5 text-[13px] font-semibold">Reply from {review.teacherName.split(" ")[0]}</p>
          <p className="text-[14px] leading-relaxed whitespace-pre-line text-muted-foreground">{review.reply}</p>
        </div>
      )}
      {actions}
    </li>
  );
}

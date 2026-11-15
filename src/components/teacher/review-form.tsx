"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTeacherReview } from "@/lib/writing/review-actions";
import { CRITERION_LABELS } from "@/lib/writing/types";

const IDS = ["task", "communication", "accuracy"] as const;

export function ReviewForm({ reviewId, initial }: { reviewId: string; initial?: { scores: Record<(typeof IDS)[number], number>; comment: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scores, setScores] = useState<Record<string, string>>({
    task: String(initial?.scores.task ?? ""),
    communication: String(initial?.scores.communication ?? ""),
    accuracy: String(initial?.scores.accuracy ?? ""),
  });
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const total = IDS.reduce((s, k) => s + (Number(scores[k]) || 0), 0);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await saveTeacherReview(reviewId, { task: Number(scores.task), communication: Number(scores.communication), accuracy: Number(scores.accuracy), comment });
          if ("error" in r) setError(r.error);
          else router.push("/teacher");
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {IDS.map((k) => (
          <label key={k} className="grid gap-1 text-[14px]">
            <span>
              {CRITERION_LABELS[k].en} <span className="text-muted-foreground">/ 15</span>
            </span>
            <Input type="number" inputMode="numeric" min={0} max={15} step={1} required value={scores[k]} onChange={(e) => setScores({ ...scores, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <p className="text-[15px]">
        Total: <strong>{total}</strong> / 45
      </p>
      <label className="grid gap-1 text-[14px]">
        Feedback for the student
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 2000))}
          rows={6}
          className="w-full resize-y rounded-xl border border-input bg-background p-3 text-[15px] leading-relaxed outline-none focus-visible:border-ink"
          placeholder="What was good, and the 2 or 3 most important things to fix."
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-[14px] text-destructive">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          Save and send to student
        </Button>
      </div>
    </form>
  );
}

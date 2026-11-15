"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestTeacherCheck, sendToTeacher } from "@/lib/writing/review-actions";
import { CRITERION_LABELS } from "@/lib/writing/types";

export type ReviewProps = {
  source: "assigned" | "code" | "offer";
  status: "requested" | "done";
  teacherName: string | null;
  total: number | null;
  criteria: { id: "task" | "communication" | "accuracy"; score: number; max: number }[];
  comment: string | null;
} | null;

/**
 * The teacher part of the writing result:
 *  - student has a teacher  -> message only ("your teacher checks this email")
 *  - standalone student     -> offer a teacher check (or send it with a teacher's code)
 *  - after the teacher is done -> the teacher's score, which is the final one
 */
export function TeacherCheckCard({ attemptId, words, hasTeacher, teacherName, review }: { attemptId: string; words: number; hasTeacher: boolean; teacherName: string | null; review: ReviewProps }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const who = (review?.teacherName ?? teacherName) ? `${review?.teacherName ?? teacherName}` : "Your teacher";

  function act(fn: () => Promise<{ error: string } | { ok: true }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  if (words < 20) {
    return hasTeacher ? (
      <Card className="grid gap-2 p-6">
        <CardTitle>Writing</CardTitle>
        <p className="text-[14px] text-muted-foreground">Your email has {words} words. Write at least 20 words next time so your teacher can check it.</p>
      </Card>
    ) : null;
  }

  if (review?.status === "done") {
    return (
      <Card className="grid gap-3 p-6">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-subtle-foreground uppercase">
          <UserCheck className="size-4" aria-hidden /> Teacher&apos;s decision
        </p>
        <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
          <Check className="size-5 text-success" aria-hidden />
          {review.total} / 45
          <span className="text-[13px] font-medium text-muted-foreground">Teacher reviewed ✓ {who !== "Your teacher" && `· ${who}`}</span>
        </p>
        <ul className="divide-y divide-border">
          {review.criteria.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-[14px]">
              <span>{CRITERION_LABELS[c.id].en}</span>
              <span className="font-semibold">
                {c.score} / {c.max}
              </span>
            </li>
          ))}
        </ul>
        {review.comment && <p className="whitespace-pre-wrap">{review.comment}</p>}
        <p className="text-[12px] text-muted-foreground">This is your final score for the writing part. It replaces the AI estimate.</p>
      </Card>
    );
  }

  if (review || hasTeacher) {
    const offer = review?.source === "offer";
    return (
      <Card className="grid gap-2 border-dashed p-6">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-subtle-foreground uppercase">
          <Clock className="size-4" aria-hidden /> Teacher&apos;s decision
        </p>
        <p className="text-[15px]">
          {offer
            ? "Your email was sent. A teacher will check it and give you feedback here."
            : `${who} will check this email and give you feedback here.`}
        </p>
      </Card>
    );
  }

  return (
    <Card className="grid gap-4 p-6">
      <div className="grid gap-1">
        <CardTitle>Want a real teacher to check it?</CardTitle>
        <p className="text-[14px] text-muted-foreground">A teacher reads your email and gives you a score and feedback. Their score is the final one.</p>
      </div>
      <div>
        <Button type="button" disabled={pending} onClick={() => act(() => requestTeacherCheck(attemptId))}>
          <UserCheck aria-hidden /> Ask for a teacher check
        </Button>
      </div>
      <form
        className="grid gap-2 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => sendToTeacher(attemptId, code));
        }}
      >
        <label htmlFor="teacher-code" className="text-[14px] font-medium">
          Learning with a teacher? Enter their code
        </label>
        <div className="flex flex-wrap gap-2">
          <Input id="teacher-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="6-letter code" autoComplete="off" className="w-40 uppercase" />
          <Button type="submit" variant="outline" disabled={pending || code.length !== 6}>
            Send to my teacher
          </Button>
        </div>
      </form>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-[14px] text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyToReview } from "@/lib/reviews/actions";

/** The teacher answers one review. An empty reply removes the answer. */
export function ReplyForm({ reviewId, initial }: { reviewId: string; initial: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        {initial ? "Edit reply" : "Reply"}
      </Button>
    );
  }
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await replyToReview({ reviewId, text });
          if ("error" in r) setError(r.error);
          else {
            setOpen(false);
            router.refresh();
          }
        });
      }}
    >
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={400} placeholder="Thank the student, or say what you will do next." aria-label="Your reply" />
      <p className="text-[13px] text-subtle-foreground">{text.length} / 400. Everyone who reads the review sees your reply.</p>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save reply"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

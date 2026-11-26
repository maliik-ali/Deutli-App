"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { moderateReview } from "@/lib/reviews/actions";

/** Admin: hide a review, keep it (dismiss the reports), or bring a hidden one back. */
export function ModerationButtons({ reviewId, hidden, hasOpenReports }: { reviewId: string; hidden: boolean; hasOpenReports: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const run = (action: "hide" | "restore" | "dismiss") =>
    start(async () => {
      setError(null);
      const r = await moderateReview({ reviewId, action });
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  return (
    <div className="grid gap-2">
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {hidden ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => run("restore")}>Bring it back</Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm("Hide this review? Students stop seeing it.")) run("hide"); }}>Hide review</Button>
        )}
        {hasOpenReports && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => run("dismiss")}>Keep it, dismiss reports</Button>}
      </div>
    </div>
  );
}

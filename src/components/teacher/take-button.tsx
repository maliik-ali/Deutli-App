"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { takeRequest } from "@/lib/writing/review-actions";

export function TakeButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="grid justify-items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await takeRequest(reviewId);
            if ("error" in r) setError(r.error);
            else router.push(`/teacher/review/${reviewId}`);
          })
        }
      >
        Take this check
      </Button>
      {error && <span className="text-[12px] text-destructive">{error}</span>}
    </span>
  );
}

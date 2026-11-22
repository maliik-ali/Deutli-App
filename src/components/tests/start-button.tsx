"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { startTest } from "@/lib/tests/actions";

export function StartTestButton({ testId, resume }: { testId: string; resume: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <Button size="lg" className="w-fit" disabled={busy} onClick={() => start(async () => { const r = await startTest(testId); if ("error" in r) setError(r.error); else router.push(`/dashboard/tests/${testId}?take=${r.attemptId}`); })}>{busy ? "Starting…" : resume ? "Continue the test" : "Start the test"}</Button>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}

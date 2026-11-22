"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { deleteTest, setTestPublished } from "@/lib/tests/actions";

export function TestButtons({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={busy} onClick={() => start(async () => { const r = await setTestPublished(id, !published); if ("error" in r) setError(r.error); else router.refresh(); })}>{published ? "Unpublish" : "Publish to students"}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm("Delete this test and all results?")) start(async () => { await deleteTest(id); router.push("/teacher/tests"); }); }}>Delete</Button>
      {error && <span role="alert" className="text-[13px] text-destructive">{error}</span>}
    </div>
  );
}

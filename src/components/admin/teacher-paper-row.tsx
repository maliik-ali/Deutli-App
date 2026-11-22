"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteTeacherPaper, setTeacherPaperPublished } from "@/lib/papers/teacher";

export function TeacherPaperRow({ id, title, published, visibility }: { id: string; title: string; published: boolean; visibility: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error: string } | { ok: true }>) => { setError(null); start(async () => { const r = await fn(); if ("error" in r) setError(r.error); else router.refresh(); }); };
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="grid gap-1">
        <span className="font-semibold">{title}</span>
        <span className="flex flex-wrap gap-1.5"><Badge variant={published ? "success" : "outline"}>{published ? "Published" : "Draft"}</Badge><Badge variant="outline">{visibility === "academy" ? "Whole workspace" : "Selected batches"}</Badge></span>
        {error && <span role="alert" className="text-[13px] text-destructive">{error}</span>}
      </span>
      <span className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => setTeacherPaperPublished(id, !published))}>{published ? "Unpublish" : "Publish"}</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm(`Delete "${title}" and its answer key?`)) run(() => deleteTeacherPaper(id)); }}>Delete</Button>
      </span>
    </li>
  );
}

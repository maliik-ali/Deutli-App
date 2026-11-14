"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deletePaper, setPaperPublished } from "@/lib/papers/actions";

export function PaperRow({ id, title, slug, published, hasAudio }: { id: string; title: string; slug: string; published: boolean; hasAudio: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ error: string } | { ok: true }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <li className="grid gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid min-w-0 flex-1">
          <span className="font-semibold">{title}</span>
          <span className="text-[13px] text-muted-foreground">
            /{slug} · {hasAudio ? "with audio" : "no audio"}
          </span>
        </div>
        <Badge variant={published ? "gold" : "outline"}>{published ? "Published" : "Draft"}</Badge>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run(() => setPaperPublished(id, !published))}>
          {published ? "Unpublish" : "Publish"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Delete "${title}" with its pages, audio, answer key and all student results? This cannot be undone.`)) run(() => deletePaper(id));
          }}
        >
          Delete
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

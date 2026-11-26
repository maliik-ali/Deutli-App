"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HELPED } from "@/lib/reviews/constants";
import { deleteMyReview, saveReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

export type MyReview = { id?: string; rating: number; helped: string[]; body: string; hidden: boolean };

/** A verified student writes (or edits) their review: stars, what helped, a few words. */
export function ReviewForm({ teacherId, firstName, initial }: { teacherId: string; firstName: string; initial: MyReview | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [helped, setHelped] = useState<string[]>(initial?.helped ?? []);
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();
  const dirty = () => setSaved(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (rating < 1) return setError("Choose 1 to 5 stars first.");
    start(async () => {
      const r = await saveReview({ teacherId, rating, helped, body });
      if ("error" in r) setError(r.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }
  function remove() {
    if (!window.confirm("Delete your review?")) return;
    start(async () => {
      const r = await deleteMyReview(teacherId);
      if ("error" in r) setError(r.error);
      else {
        setRating(0);
        setHelped([]);
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <Card className="gap-5">
      <div className="grid gap-1">
        <CardTitle className="text-lg">{initial ? "Your review" : `Review ${firstName}`}</CardTitle>
        <CardDescription>You studied with {firstName}, so your opinion counts. Other students read it before they choose a teacher.</CardDescription>
      </div>
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[13px] font-medium text-muted-foreground">How was it?</legend>
          <div role="radiogroup" aria-label="Rating" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => { dirty(); setRating(n); }}
                className="grid size-11 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Star className={cn("size-7", n <= rating ? "fill-brand-cyan text-brand-cyan" : "text-border")} aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[13px] font-medium text-muted-foreground">What helped you? (optional)</legend>
          <div className="flex flex-wrap gap-1.5">
            {HELPED.map((h) => {
              const on = helped.includes(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => { dirty(); setHelped(on ? helped.filter((x) => x !== h.id) : [...helped, h.id]); }}
                  className={cn("inline-flex h-11 items-center rounded-full border px-4 text-[13px] font-medium transition-colors", on ? "border-gold-ink bg-gold/30 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor="review-body">
            In your own words <span className="font-normal text-subtle-foreground">(optional)</span>
          </Label>
          <Textarea id="review-body" value={body} onChange={(e) => { dirty(); setBody(e.target.value); }} rows={4} maxLength={600} placeholder="What did you learn? Who is this teacher good for?" />
          <p className="text-[13px] text-subtle-foreground">{body.length} / 600</p>
        </div>

        {initial?.hidden && <p className="rounded-xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">Deutli has hidden this review for now. Only you can see it.</p>}
        {error && <p role="alert" className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p>}
        {saved && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Thank you. Your review is saved.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Post review"}</Button>
          {initial && <Button type="button" variant="ghost" disabled={busy} onClick={remove}>Delete my review</Button>}
        </div>
      </form>
    </Card>
  );
}

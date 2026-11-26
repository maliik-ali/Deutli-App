"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker, TimePicker } from "@/components/ui/date-picker";
import { createOneToOneSlots, deleteFreeSlot } from "@/lib/classes/actions";
import { cn } from "@/lib/utils";

const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";

export function NewSlotsForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [v, setV] = useState({ date: defaultDate, time: "18:00", durationMin: "30", priceEur: "", repeatWeeks: "1" });
  const [isTrial, setIsTrial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createOneToOneSlots({ date: v.date, time: v.time, durationMin: Number(v.durationMin), priceEur: v.priceEur, repeatWeeks: Number(v.repeatWeeks), isTrial });
          if ("error" in r) setError(r.error);
          else router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className={field}><label htmlFor="slot-date">Date</label><DatePicker id="slot-date" value={v.date} onChange={(date) => setV({ ...v, date })} min={defaultDate} /></div>
        <div className={field}><label htmlFor="slot-time">Start</label><TimePicker id="slot-time" value={v.time} onChange={(time) => setV({ ...v, time })} /></div>
        <label className={field}>Length (minutes)<Input type="number" inputMode="numeric" min={15} max={180} step={5} value={v.durationMin} onChange={(e) => setV({ ...v, durationMin: e.target.value })} /></label>
        <label className={field}>Price (€)<Input inputMode="decimal" value={v.priceEur} onChange={(e) => setV({ ...v, priceEur: e.target.value })} placeholder={isTrial ? "0 = free" : "25"} /></label>
        <label className={field}>Repeat weekly<Input type="number" inputMode="numeric" min={1} max={12} value={v.repeatWeeks} onChange={(e) => setV({ ...v, repeatWeeks: e.target.value })} /></label>
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px]">
        <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} className="peer sr-only" />
        <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card", isTrial ? "border-gold bg-gold text-white" : "border-border")}>
          {isTrial && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span>
          This is a trial lesson
          <span className="mt-0.5 block text-[13px] text-muted-foreground">A short first lesson so a new student can meet you. Each student can book one trial with you. Leave the price empty for a free trial.</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Adding…" : isTrial ? "Add trial slot" : "Add slot"}</Button>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      </div>
    </form>
  );
}

export function DeleteSlot({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => start(async () => { const r = await deleteFreeSlot(id); if ("error" in r) setError(r.error); else router.refresh(); })}>Remove</Button>
      {error && <span role="alert" className="text-[13px] text-destructive">{error}</span>}
    </span>
  );
}

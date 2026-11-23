"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker, TimePicker } from "@/components/ui/date-picker";
import { createOneToOneSlots, deleteFreeSlot } from "@/lib/classes/actions";

const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";

export function NewSlotsForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [v, setV] = useState({ date: defaultDate, time: "18:00", durationMin: "30", priceEur: "", repeatWeeks: "1" });
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createOneToOneSlots({ date: v.date, time: v.time, durationMin: Number(v.durationMin), priceEur: v.priceEur, repeatWeeks: Number(v.repeatWeeks) });
          if ("error" in r) setError(r.error);
          else router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className={field}><label htmlFor="slot-date">Date</label><DatePicker id="slot-date" value={v.date} onChange={(date) => setV({ ...v, date })} min={defaultDate} /></div>
        <div className={field}><label htmlFor="slot-time">Start</label><TimePicker id="slot-time" value={v.time} onChange={(time) => setV({ ...v, time })} /></div>
        <label className={field}>Length (minutes)<Input type="number" inputMode="numeric" min={15} max={180} step={5} value={v.durationMin} onChange={(e) => setV({ ...v, durationMin: e.target.value })} /></label>
        <label className={field}>Price (€)<Input inputMode="decimal" value={v.priceEur} onChange={(e) => setV({ ...v, priceEur: e.target.value })} placeholder="25" /></label>
        <label className={field}>Repeat weekly<Input type="number" inputMode="numeric" min={1} max={12} value={v.repeatWeeks} onChange={(e) => setV({ ...v, repeatWeeks: e.target.value })} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add free slot"}</Button>
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

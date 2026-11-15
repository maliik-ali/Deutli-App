"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAccount, addPlan, approveOrder, deleteAccount, rejectOrder, setPlanActive } from "@/lib/pro/admin-actions";

type Res = { error: string } | { ok: true };

function useRun() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<Res>, then?: () => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else {
        then?.();
        router.refresh();
      }
    });
  };
  return { error, busy, run };
}

export function OrderActions({ id }: { id: string }) {
  const { error, busy, run } = useRun();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={busy} onClick={() => run(() => approveOrder(id))}>
        Approve
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => rejectOrder(id, window.prompt("Reason for the student (optional):") ?? ""))}>
        Reject
      </Button>
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </div>
  );
}

export function PlanForm() {
  const { error, busy, run } = useRun();
  const [name, setName] = useState("");
  const [months, setMonths] = useState("");
  const [price, setPrice] = useState("");
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addPlan({ name, months, price }), () => {
          setName("");
          setMonths("");
          setPrice("");
        });
      }}
    >
      <label className="grid gap-1.5 text-sm font-semibold">Name<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="3 months" /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Months<Input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="3" /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Price (Rs.)<Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" /></label>
      <Button type="submit" disabled={busy}>Add plan</Button>
      {error && <p role="alert" className="text-[13px] text-destructive sm:col-span-4">{error}</p>}
    </form>
  );
}

export function PlanToggle({ id, active }: { id: string; active: boolean }) {
  const { busy, run } = useRun();
  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => setPlanActive(id, !active))}>
      {active ? "Hide from students" : "Show to students"}
    </Button>
  );
}

export function AccountForm() {
  const { error, busy, run } = useRun();
  const [v, setV] = useState({ label: "", title: "", number: "", note: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addAccount(v), () => setV({ label: "", title: "", number: "", note: "" }));
      }}
    >
      <label className="grid gap-1.5 text-sm font-semibold">Bank or wallet<Input value={v.label} onChange={set("label")} placeholder="EasyPaisa" /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Account title<Input value={v.title} onChange={set("title")} placeholder="Name on the account" /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Account / phone number<Input value={v.number} onChange={set("number")} placeholder="03xx xxxxxxx or IBAN" /></label>
      <label className="grid gap-1.5 text-sm font-semibold">Note (optional)<Input value={v.note} onChange={set("note")} placeholder="Branch, or how to send" /></label>
      <div className="sm:col-span-2"><Button type="submit" disabled={busy}>Add account</Button></div>
      {error && <p role="alert" className="text-[13px] text-destructive sm:col-span-2">{error}</p>}
    </form>
  );
}

export function DeleteAccount({ id }: { id: string }) {
  const { busy, run } = useRun();
  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={() => window.confirm("Remove this account from the payment page?") && run(() => deleteAccount(id))}>
      Remove
    </Button>
  );
}

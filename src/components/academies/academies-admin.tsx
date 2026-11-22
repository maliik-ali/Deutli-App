"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { UsageMeter } from "@/components/academies/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWorkspace, updateWorkspace } from "@/lib/academies/actions";

type Res = { error: string } | { ok: true };

export type PlanOption = { id: string; code: string; kind: "teacher" | "school"; name: string; priceLabel: string; removeBranding: boolean };
export type WorkspaceItem = {
  id: string;
  name: string;
  kind: "teacher" | "school";
  ownerName: string;
  ownerEmail: string | null;
  planId: string | null;
  students: number;
  maxStudents: number | null;
  teachers: number;
  maxTeachers: number | null;
  discountPercent: number;
  discountUntil: string;
  showPoweredBy: boolean;
};

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

function PlanSelect({ id, value, onChange, plans, kind }: { id: string; value: string; onChange: (v: string) => void; plans: PlanOption[]; kind?: "teacher" | "school" }) {
  const list = kind ? plans.filter((p) => p.kind === kind) : plans;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-11 rounded-xl text-[15px]">
        <SelectValue placeholder="Choose a plan" />
      </SelectTrigger>
      <SelectContent>
        {list.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} · {p.priceLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";

export function CreateWorkspaceForm({ plans }: { plans: PlanOption[] }) {
  const { error, busy, run } = useRun();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"teacher" | "school">("school");
  const [planId, setPlanId] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createWorkspace({ name, kind, ownerEmail: email, planId }), () => {
          setName("");
          setEmail("");
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          Workspace name
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pilot Academy" maxLength={120} required />
        </label>
        <label className={field}>
          Owner&apos;s email (they must have an account)
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" required />
        </label>
        <div className={field}>
          <span id="ws-kind">Type</span>
          <div role="radiogroup" aria-labelledby="ws-kind" className="flex gap-2">
            {(["school", "teacher"] as const).map((k) => (
              <label key={k} className="relative flex-1">
                <input
                  type="radio"
                  name="ws-kind"
                  className="peer sr-only"
                  checked={kind === k}
                  onChange={() => {
                    setKind(k);
                    setPlanId("");
                  }}
                />
                <span className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-input bg-card text-[15px] font-semibold text-foreground transition-colors peer-checked:border-gold-ink peer-checked:bg-gold-soft peer-checked:text-gold-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                  {k === "school" ? "School" : "Solo teacher"}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className={field}>
          <label htmlFor="ws-plan">Plan</label>
          <PlanSelect id="ws-plan" value={planId} onChange={setPlanId} plans={plans} kind={kind} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !planId}>
          {busy ? "Creating…" : "Create workspace"}
        </Button>
        {error && (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

export function WorkspaceRow({ item, plans }: { item: WorkspaceItem; plans: PlanOption[] }) {
  const { error, busy, run } = useRun();
  const [planId, setPlanId] = useState(item.planId ?? "");
  const [discount, setDiscount] = useState(String(item.discountPercent));
  const [until, setUntil] = useState(item.discountUntil);
  const [powered, setPowered] = useState(item.showPoweredBy);
  const plan = plans.find((p) => p.id === planId);
  const canRemove = plan?.removeBranding ?? false;

  return (
    <li className="grid gap-4 py-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.name}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            Owner {item.ownerName}
            {item.ownerEmail ? ` · ${item.ownerEmail}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{item.kind === "school" ? "School" : "Solo teacher"}</Badge>
          {item.discountPercent > 0 && <Badge variant="gold">{item.discountPercent}% off</Badge>}
        </div>
      </div>

      <div className={item.kind === "school" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
        <UsageMeter label="Students" used={item.students} limit={item.maxStudents} />
        {item.kind === "school" && <UsageMeter label="Teachers" used={item.teachers} limit={item.maxTeachers} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr_1fr]">
        <div className={field}>
          <label htmlFor={`plan-${item.id}`}>Plan</label>
          <PlanSelect id={`plan-${item.id}`} value={planId} onChange={setPlanId} plans={plans} />
        </div>
        <label className={field}>
          Discount %
          <Input type="number" inputMode="numeric" min={0} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
        <label className={field}>
          Discount ends
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} disabled={Number(discount) === 0} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className={`relative flex min-h-11 items-center gap-3 text-[14px] ${canRemove ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
          <input type="checkbox" className="peer sr-only" checked={powered} disabled={!canRemove} onChange={(e) => setPowered(e.target.checked)} />
          <span className="grid size-5 place-items-center rounded-md border border-input bg-card text-transparent transition-colors peer-checked:border-gold-ink peer-checked:bg-gold-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
            <Check className="size-3.5" aria-hidden />
          </span>
          Show &quot;Powered by Deutli&quot;
          {!canRemove && <span className="text-[12px] text-muted-foreground">(can only be hidden on School Pro and above)</span>}
        </label>
        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !planId}
            onClick={() => run(() => updateWorkspace({ id: item.id, planId, discountPercent: discount || 0, discountUntil: Number(discount) > 0 ? until : "", showPoweredBy: canRemove ? powered : true }))}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </li>
  );
}

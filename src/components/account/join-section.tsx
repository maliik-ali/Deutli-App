"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWithCode } from "@/lib/join/actions";
import { Section } from "./account-ui";

/** Account: join a teacher or school with their code (for students who did not use a code at signup). */
export function JoinSection({ workspaceName }: { workspaceName: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <Section title="Teacher or school" description={workspaceName ? `You are part of ${workspaceName}.` : "Got a code from your teacher or school? Enter it to join them."}>
      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,260px)_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const r = await joinWithCode(code);
            if ("error" in r) setMsg({ ok: false, text: r.error });
            else {
              setMsg({ ok: true, text: r.message });
              setCode("");
              router.refresh();
            }
          });
        }}
      >
        <label className="grid gap-1.5 text-[13px] font-medium text-muted-foreground">
          {workspaceName ? "Join another teacher or school" : "Teacher or school code"}
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC234" autoComplete="off" autoCapitalize="characters" spellCheck={false} className="font-mono tracking-[0.2em] uppercase" />
        </label>
        <Button type="submit" className="justify-self-start" disabled={busy || code.trim().length !== 6}>
          {busy ? "Joining…" : "Join"}
        </Button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-[13px] sm:col-span-2 ${msg.ok ? "text-success" : "text-destructive"}`}>
            {msg.text}
          </p>
        )}
      </form>
    </Section>
  );
}

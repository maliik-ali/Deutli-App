"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { makeNewJoinCode, setJoinCodeActive } from "@/lib/join/actions";

/** Teacher page: the join code, the signup link and a QR. `qr` is SVG made on our server. */
export function JoinCodeCard({ code, active, link, qr }: { code: string; active: boolean; link: string; qr: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function run(fn: () => Promise<{ error: string } | { ok: true }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  return (
    <Card className="grid h-full content-start gap-5 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
      <div className="grid gap-3">
        <div className="grid gap-1">
          <CardTitle>Your join code</CardTitle>
          <p className="text-[14px] text-muted-foreground">Students join your workspace with this code, the link or the QR.</p>
        </div>
        <p className={`font-mono text-2xl font-extrabold tracking-[0.16em] ${active ? "" : "text-muted-foreground line-through"}`}>{code}</p>
        {!active && <p className="text-[13px] font-medium text-gold-ink">This code is switched off. New students can&apos;t use it.</p>}
        <p className="truncate rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-muted-foreground" title={link}>{link}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={copy} className="h-11 sm:h-9">
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => setJoinCodeActive(!active))} className="h-11 px-3 text-muted-foreground sm:h-9">
            {active ? "Switch off" : "Switch on"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Make a new code? The old code and link stop working. Students already in stay in.")) run(makeNewJoinCode);
            }}
            className="h-11 px-3 text-muted-foreground sm:h-9"
          >
            New code
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className={`size-28 shrink-0 overflow-hidden rounded-xl border border-border bg-white p-1 ${active ? "" : "opacity-40"}`} role="img" aria-label={`QR code for the join link ${link}`} dangerouslySetInnerHTML={{ __html: qr }} />
    </Card>
  );
}

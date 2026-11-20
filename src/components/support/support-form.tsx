"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FEEDBACK_KINDS, MAX_FEEDBACK, type FeedbackKind } from "@/lib/support/contact";
import { sendFeedback } from "@/lib/support/actions";
import { cn } from "@/lib/utils";

/** Send a message to Deutli: what kind it is, and what happened. We add the student's contact details and the page on the server. */
export function SupportForm({ initialKind, from }: { initialKind: FeedbackKind; from: string }) {
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, start] = useTransition();

  if (sent)
    return (
      <Card className="gap-4">
        <p className="flex items-center gap-2 text-lg font-bold text-success" role="status">
          <CheckCircle2 className="size-5" aria-hidden /> Thank you, we got your message
        </p>
        <p className="text-[15px] text-muted-foreground">We read every message. If it needs an answer, we will contact you by email or WhatsApp.</p>
        <div>
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              setMessage("");
            }}
          >
            Send another message
          </Button>
        </div>
      </Card>
    );

  return (
    <Card className="gap-5">
      <div className="grid gap-1">
        <CardTitle className="text-xl">Send us a message</CardTitle>
        <CardDescription>Tell us what happened or what would help. The more detail, the faster we can help.</CardDescription>
      </div>
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await sendFeedback({ kind, message, page: from });
            if ("error" in r) setError(r.error);
            else setSent(true);
          });
        }}
      >
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold">What is it about?</legend>
          <div role="radiogroup" aria-label="Kind of message" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FEEDBACK_KINDS.map((k) => {
              const on = kind === k.id;
              return (
                <label
                  key={k.id}
                  className={cn(
                    "grid min-h-14 cursor-pointer content-center gap-0.5 rounded-xl border px-4 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-ink",
                    on ? "border-gold-ink bg-gold-soft" : "border-border hover:bg-muted",
                  )}
                >
                  <input type="radio" name="kind" value={k.id} checked={on} onChange={() => setKind(k.id)} className="sr-only" />
                  <span className="text-[15px] font-semibold">{k.label}</span>
                  <span className="text-[12px] leading-snug text-muted-foreground">{k.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="grid gap-2 text-sm font-semibold">
          Your message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_FEEDBACK))}
            rows={6}
            required
            placeholder={kind === "payment" ? "For example: I paid on 14 Feb by JazzCash, my reference is DT-ABC234, but Pro is not on yet." : "Write here…"}
            className="w-full resize-y rounded-xl border border-input bg-background p-3 text-[15px] font-normal outline-none focus-visible:border-ring"
          />
          <span className="text-right text-[12px] font-normal text-subtle-foreground">
            {message.length} / {MAX_FEEDBACK}
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-[14px] text-destructive">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />} {busy ? "Sending…" : "Send message"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

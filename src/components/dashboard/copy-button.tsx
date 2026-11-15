"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked: the number stays selectable */
        }
      }}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-muted"
      aria-label={done ? "Copied" : `Copy ${text}`}
    >
      {done ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />} {done ? "Copied" : "Copy"}
    </button>
  );
}

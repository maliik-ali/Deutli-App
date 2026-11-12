"use client";

import { Check } from "lucide-react";

import { LANGUAGES, MAX_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";

/** Toggle buttons for picking up to MAX_LANGUAGES meaning languages. */
export function LanguageChips({
  value,
  onChange,
  legend,
}: {
  value: LanguageCode[];
  onChange: (next: LanguageCode[]) => void;
  legend: string;
}) {
  function toggle(code: LanguageCode) {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else if (value.length < MAX_LANGUAGES) onChange([...value, code]);
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-[13px] font-medium text-muted-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {LANGUAGES.map((l) => {
          const on = value.includes(l.code);
          const full = !on && value.length >= MAX_LANGUAGES;
          return (
            <button
              key={l.code}
              type="button"
              aria-pressed={on}
              disabled={full}
              onClick={() => toggle(l.code)}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:opacity-40",
                on
                  ? "border-gold-ink bg-gold/30 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {on && <Check className="size-3.5" aria-hidden />}
              {l.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

"use client";

import { Check, CircleHelp, Layers, TrendingUp, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguageFlag } from "@/components/language-flag";
import { LANGUAGES, getLanguage, type LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";

export const STEP_COUNT = 4;
export const TIMELINE_ICONS = {
  zap: Zap,
  trend: TrendingUp,
  layers: Layers,
  help: CircleHelp,
} as const;

/** A selectable card. "radio" = pick one, "check" = pick several. */
export function Choice({
  selected,
  onClick,
  kind,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  kind: "radio" | "check";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={kind === "radio" ? "radio" : "checkbox"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-16 w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-colors sm:p-5",
        selected
          ? "border-gold-ink bg-gold-soft"
          : "border-border hover:border-gold-ink/60 hover:bg-muted/40",
        className,
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center border-2 transition-colors",
          kind === "radio" ? "rounded-full" : "rounded-md",
          selected ? "border-gold bg-gold text-white" : "border-border",
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Heading({ title, text }: { title: string; text: string }) {
  return (
    // One rule for every step: headings are centred.
    <div className="mx-auto grid max-w-2xl gap-2 text-center">
      <h1 className="text-[26px] leading-tight font-extrabold sm:text-[32px]">
        {title}
      </h1>
      <p className="text-[15px] text-muted-foreground sm:text-base">{text}</p>
    </div>
  );
}

export const NONE = "none";

/** Dates as YYYY-MM-DD in the student's local time (no time-zone shift). */
export function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fromIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function longDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fromIso(iso));
}

/** Dropdown of all languages, each shown in English and in its own script. */
export function LanguageSelect({
  id,
  label,
  hint,
  value,
  onChange,
  exclude,
  optional,
}: {
  id: string;
  label: string;
  hint?: string;
  value: LanguageCode | null;
  onChange: (code: LanguageCode | null) => void;
  exclude?: LanguageCode | null;
  optional?: boolean;
}) {
  const chosen = value ? getLanguage(value) : null;
  return (
    <div className="grid gap-2">
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="text-[15px] font-semibold"
      >
        {label}
        {optional && (
          <span className="ml-1.5 font-normal text-subtle-foreground">
            (optional)
          </span>
        )}
      </label>
      {/* No choice yet: "" shows the placeholder; the optional list starts on "None". */}
      <Select
        value={value ?? (optional ? NONE : "")}
        onValueChange={(v) =>
          onChange(v === NONE || v === "" ? null : (v as LanguageCode))
        }
      >
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-describedby={hint || chosen ? `${id}-hint` : undefined}
          className={cn(value && "border-gold-ink/60")}
        >
          <SelectValue placeholder="Choose a language" />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>None</SelectItem>}
          {LANGUAGES.filter((l) => l.code !== exclude).map((l) => (
            <SelectItem
              key={l.code}
              value={l.code}
              textValue={l.name}
              aside={
                l.native !== l.name && (
                  <span
                    lang={l.code}
                    dir={l.rtl ? "rtl" : "ltr"}
                    className={cn(l.code === "ur" && "urdu leading-none")}
                  >
                    {l.native}
                  </span>
                )
              }
            >
              <span className="flex items-center gap-2.5">
                <LanguageFlag code={l.code} />
                {l.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(hint || (chosen && chosen.native !== chosen.name)) && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {chosen && chosen.native !== chosen.name ? (
            <>
              Meanings will appear in{" "}
              <span
                lang={chosen.code}
                dir={chosen.rtl ? "rtl" : "ltr"}
                className={cn(
                  "text-foreground",
                  chosen.code === "ur" && "urdu",
                )}
              >
                {chosen.native}
              </span>
              .
            </>
          ) : (
            hint
          )}
        </p>
      )}
    </div>
  );
}

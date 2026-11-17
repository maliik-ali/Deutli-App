// Round country flag next to a language name. Flags come from country-flag-icons (MIT),
// as SVGs, so they look the same on every device (emoji flags show as letters on Windows).
import { AF, BD, CN, ES, FR, GB, IN, IR, IT, PK, PT, RU, SA, TR } from "country-flag-icons/react/1x1";

import { cn } from "@/lib/utils";

const FLAGS: Record<string, typeof GB> = {
  en: GB,
  ur: PK,
  hi: IN,
  ar: SA,
  fa: IR,
  ps: AF,
  bn: BD,
  tr: TR,
  es: ES,
  fr: FR,
  it: IT,
  pt: PT,
  ru: RU,
  zh: CN,
};

/** The flag usually linked to a language (a hint, not a statement about where it is spoken). */
export function LanguageFlag({ code, className }: { code: string; className?: string }) {
  const Flag = FLAGS[code];
  if (!Flag) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-6 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-white/15",
        className,
      )}
    >
      <Flag className="size-full scale-110" />
    </span>
  );
}

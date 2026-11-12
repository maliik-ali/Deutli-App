import { getLanguage, textProps, type LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";

/** One meaning in the right script, direction and font (Urdu in Nastaliq, etc.). */
export function Meaning({
  code,
  text,
  className,
  showLabel,
}: {
  code: LanguageCode;
  text: string | undefined;
  className?: string;
  showLabel?: boolean;
}) {
  const props = textProps(code);
  if (!text) return null;
  return (
    <span
      lang={props.lang}
      dir={props.dir}
      title={showLabel ? undefined : getLanguage(code)?.name}
      className={cn(
        "min-w-0",
        props.dir === "rtl" && "text-right",
        props.className,
        code === "ur" && "text-[1.15em] leading-[2]",
        className,
      )}
    >
      {showLabel && (
        <span className="mr-1.5 text-[11px] font-semibold text-subtle-foreground uppercase" dir="ltr">
          {code}
        </span>
      )}
      {text}
    </span>
  );
}

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** 1 to 5 filled stars, with the number for screen readers. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= Math.round(value) ? "fill-brand-cyan text-brand-cyan" : "text-border")} aria-hidden />
      ))}
    </span>
  );
}

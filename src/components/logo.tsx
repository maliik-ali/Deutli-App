import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "dark",
  href = "/",
}: {
  className?: string;
  tone?: "dark" | "light";
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-lg", className)}
      aria-label="Gateway2Deutsch home"
    >
      <span className="grid size-9 place-items-center rounded-[10px] bg-gold font-heading text-[13px] font-extrabold text-gold-foreground">
        G2D
      </span>
      <span
        className={cn(
          "font-heading text-[15px] font-bold",
          tone === "light" ? "text-ink-foreground" : "text-foreground"
        )}
      >
        Gateway2Deutsch
      </span>
    </Link>
  );
}

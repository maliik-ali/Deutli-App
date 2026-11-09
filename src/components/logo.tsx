import Image from "next/image";
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
      aria-label="Deutli home"
    >
      <Image
        src="/deutli-owl.png"
        alt=""
        width={36}
        height={38}
        priority
        className="h-9 w-auto"
      />
      <span
        className={cn(
          "font-heading text-[18px] font-bold",
          tone === "light" ? "text-ink-foreground" : "text-foreground"
        )}
      >
        Deutli
      </span>
    </Link>
  );
}

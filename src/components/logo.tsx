"use client";

import Image from "next/image";
import Link from "next/link";

import { useBrand } from "@/components/branding/brand-shell";
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
  const brand = useBrand();
  const name = brand?.name ?? "Deutli";
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-lg", className)}
      aria-label={`${name} home`}
    >
      {brand?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the school's own logo from our storage, any size
        <img src={brand.logoUrl} alt="" className="h-9 w-auto max-w-[120px] rounded-md object-contain" />
      ) : brand?.name ? null : (
        <Image src="/deutli-owl.png" alt="" width={36} height={38} priority className="h-9 w-auto" />
      )}
      <span
        className={cn(
          "font-heading text-[18px] font-bold",
          tone === "light" ? "text-ink-foreground" : "text-foreground"
        )}
      >
        {name}
      </span>
    </Link>
  );
}

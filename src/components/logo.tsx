"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useBrand } from "@/components/branding/brand-shell";
import { cn } from "@/lib/utils";

export const TRIAL_DRAFT_EVENT = "deutli-branding-draft";

/** The logo a teacher is trying on the Branding page (kept on this device). Null if none. */
function useTrialLogo(key: string | null | undefined): string | null {
  const read = () => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? ((JSON.parse(raw) as { logo?: string | null }).logo ?? null) : null;
    } catch {
      return null;
    }
  };
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener(TRIAL_DRAFT_EVENT, cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(TRIAL_DRAFT_EVENT, cb);
      };
    },
    read,
    () => null,
  );
}

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
  const trialLogo = useTrialLogo(brand?.trialDraftKey);
  return (
    <Link
      href={href}
      className={cn("inline-flex max-w-full min-w-0 items-center gap-2.5 rounded-lg", className)}
      aria-label={`${name} home`}
      title={name}
    >
      {trialLogo && !brand?.logoUrl ? (
        // The owner's own preview: their plan has no logo yet, so only they see it, on this device.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={trialLogo} alt="" className="h-9 w-auto max-w-[120px] shrink-0 rounded-md object-contain" />
      ) : brand?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the school's own logo from our storage, any size
        <img src={brand.logoUrl} alt="" className="h-9 w-auto max-w-[120px] shrink-0 rounded-md object-contain" />
      ) : brand?.name ? null : (
        <Image src="/deutli-owl.png" alt="" width={36} height={38} priority className="h-9 w-auto" />
      )}
      <span
        className={cn(
          "min-w-0 truncate font-heading text-[18px] font-bold",
          tone === "light" ? "text-ink-foreground" : "text-foreground"
        )}
      >
        {name}
      </span>
      {trialLogo && !brand?.logoUrl && <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold-ink">Preview</span>}
    </Link>
  );
}

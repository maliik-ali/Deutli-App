import { cn } from "@/lib/utils";

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "S"
  );
}

/** Round profile picture, or the person's initials when there is no photo. */
export function Avatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-soft font-heading text-[13px] font-bold text-gold-ink",
        className,
      )}
      aria-hidden
    >
      {url ? (
        // Signed links from a private bucket: a plain <img> avoids Next's image optimiser caching them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

import { ExternalLink } from "lucide-react";

import type { ProfileLink } from "@/lib/profile/links";

/** Website and social pages as small pills. They open in a new tab; the address was checked before it got here. */
export function ProfileLinks({ links, className }: { links: ProfileLink[]; className?: string }) {
  if (links.length === 0) return null;
  return (
    <ul className={className ?? "flex flex-wrap gap-2"} aria-label="Links">
      {links.map((l) => (
        <li key={l.key}>
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[14px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:min-h-9"
          >
            {l.label}
            <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

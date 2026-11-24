"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Copyright and legal links under the auth pages. The signup page leaves them out to stay short. */
export function AuthFooter() {
  if (usePathname() === "/signup") return null;
  return (
    <footer className="grid gap-1 text-center text-[13px] text-subtle-foreground">
      <span>© Deutli · German B1 exam preparation</span>
      <span className="flex justify-center gap-4">
        <Link href="/privacy" className="py-2 hover:text-foreground">Privacy policy</Link>
        <Link href="/terms" className="py-2 hover:text-foreground">Terms</Link>
        <a href="https://www.deutli.com/impressum" className="py-2 hover:text-foreground">Impressum</a>
      </span>
    </footer>
  );
}

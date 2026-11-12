import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";

/** Simple page frame for admin screens: top bar, optional back link, title. */
export function AdminShell({
  title,
  description,
  back,
  actions,
  children,
}: {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-8">
        <Logo href="/admin" />
        <SignOutButton compact />
      </header>
      <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-8 sm:px-8">
        <div className="grid gap-3">
          {back && (
            <Link
              href={back.href}
              className="inline-flex h-9 w-fit items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden /> {back.label}
            </Link>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-1">
              <h1 className="text-[28px] leading-tight font-extrabold">{title}</h1>
              {description && <p className="max-w-xl text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

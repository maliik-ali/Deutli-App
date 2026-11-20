import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Page frame for admin screens: optional back link, title and actions. The menu comes from the admin layout. */
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
    <>
      <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-8 sm:px-8">
        <div className="grid gap-3">
          {back && back.href !== "/admin" && (
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
    </>
  );
}

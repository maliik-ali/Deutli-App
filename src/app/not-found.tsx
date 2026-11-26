import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, Compass, Home, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { homeForRole } from "@/lib/auth/roles";

/** Shown for every address that does not exist (and for pages a person may not open: the answer is the same). */
export default async function NotFound() {
  const user = await getCurrentUser();
  const home = user ? homeForRole(user.role) : null;
  const first = user?.fullName?.trim().split(/\s+/)[0];

  const suggestions =
    user?.role === "student"
      ? [
          { href: "/dashboard/vocabulary", label: "Vocabulary", hint: "Learn ten new words", icon: BookOpen },
          { href: "/dashboard/classes", label: "Classes", hint: "Join a live class", icon: Compass },
        ]
      : [];

  return (
    <main className="mx-auto grid min-h-[70dvh] w-full max-w-xl place-items-center px-6 py-16">
      <div className="grid justify-items-center gap-6 text-center">
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-gold-soft blur-2xl" />
          <Image src="/deutli-owl.png" alt="" width={112} height={119} priority className="h-[119px] w-auto" />
        </div>
        <div className="grid gap-2">
          <p className="text-[13px] font-semibold tracking-[0.2em] text-gold-ink uppercase">Error 404</p>
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[34px]">{first ? `Hmm ${first}, we can't find that page` : "We can't find that page"}</h1>
          <p className="mx-auto max-w-md text-[16px] text-muted-foreground">The link may be old, or the page has moved. No problem: let&apos;s get you back to learning German.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {home ? (
            <Button asChild size="lg">
              <Link href={home}>
                <Home aria-hidden /> Go to my dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/login">
                  <LogIn aria-hidden /> Log in
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signup">
                  <UserPlus aria-hidden /> Create account
                </Link>
              </Button>
            </>
          )}
        </div>

        {suggestions.length > 0 && (
          <ul className="grid w-full max-w-md gap-2 sm:grid-cols-2">
            {suggestions.map(({ href, label, hint, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 text-left transition-colors hover:border-gold-ink/60 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="grid">
                    <span className="text-[15px] font-semibold">{label}</span>
                    <span className="text-[13px] text-muted-foreground">{hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[13px] text-muted-foreground">
          <ArrowLeft className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
          Or go back with your browser&apos;s back button.
        </p>
      </div>
    </main>
  );
}

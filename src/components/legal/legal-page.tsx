import Link from "next/link";

import { Logo } from "@/components/logo";

/** Plain page shell for Privacy and Terms (public, no login). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-[760px] items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <Link href="/login" className="py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Log in
        </Link>
      </header>
      <main className="mx-auto grid max-w-[760px] gap-6 px-4 pb-16 sm:px-6 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-5 [&_ul]:text-[15px] [&_ul]:text-muted-foreground">
        <div className="grid gap-1">
          <h1 className="text-[28px] font-extrabold sm:text-[32px]">{title}</h1>
          <p className="!text-[13px]">Last updated: {updated}</p>
        </div>
        {children}
      </main>
      <footer className="mx-auto flex max-w-[760px] gap-4 px-4 pb-10 text-[13px] text-subtle-foreground sm:px-6">
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        <Link href="/terms" className="hover:text-foreground">Terms</Link>
      </footer>
    </div>
  );
}

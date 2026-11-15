import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-background px-4 py-6 sm:py-8">
      {/* Soft purple light behind the card (decoration only) */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[26rem] w-[44rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
      <header className="relative">
        <Logo />
      </header>
      <main className="relative flex w-full flex-1 items-center justify-center py-8">
        <div className="w-full max-w-[440px] rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/40 sm:p-9">{children}</div>
      </main>
      <footer className="relative text-center text-[13px] text-subtle-foreground">© Deutli · German B1 exam preparation</footer>
    </div>
  );
}

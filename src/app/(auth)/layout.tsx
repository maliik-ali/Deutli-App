import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col items-center px-4 py-6 sm:px-10 sm:py-8">
        <header>
          <Logo />
        </header>
        <main className="flex w-full flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
        <AuthFooter />
      </div>

      <aside aria-label="About Deutli" className="relative hidden overflow-hidden bg-ink text-ink-foreground lg:flex lg:flex-col lg:justify-center lg:gap-10 lg:p-12 xl:p-16">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-gold/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 h-[24rem] w-[24rem] rounded-full bg-brand-magenta/15 blur-3xl" />
        <div className="relative grid gap-3">
          <p className="text-[13px] font-semibold tracking-[0.14em] text-brand-cyan uppercase">Goethe · telc · ÖSD B1</p>
          <h2 className="max-w-lg text-[34px] leading-[1.1] font-extrabold xl:text-[42px]">Pass your German B1 with AI and a real teacher</h2>
        </div>
        <div className="relative">
          <AuthShowcase />
        </div>
      </aside>
    </div>
  );
}

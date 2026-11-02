import { CheckCircle2 } from "lucide-react";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10 sm:py-8">
        <header>
          <Logo />
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
        <footer className="text-center text-[13px] text-subtle-foreground lg:text-left">
          © Gateway2Deutsch · German B1 exam preparation
        </footer>
      </div>
      <PromisePanel />
    </div>
  );
}

function PromisePanel() {
  return (
    <aside
      aria-label="About Gateway2Deutsch"
      className="relative hidden overflow-hidden bg-ink p-12 text-ink-foreground lg:flex lg:flex-col lg:justify-between xl:p-16"
    >
      <p className="text-[13px] font-semibold tracking-[0.14em] text-gold uppercase">
        Goethe · telc · ÖSD B1
      </p>

      <div className="grid gap-10">
        <h2 className="max-w-md text-[40px] leading-[1.1] font-extrabold xl:text-[48px]">
          Pass your German B1 — with AI and a real teacher
        </h2>

        {/* Small product preview */}
        <div className="grid max-w-md gap-3" aria-hidden>
          <div className="rounded-2xl bg-card p-5 text-card-foreground">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold">B1 readiness</p>
              <p className="font-heading text-3xl font-extrabold">72%</p>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["Lesen", 84, "ink"],
                ["Hören", 76, "ink"],
                ["Schreiben", 58, "gold"],
                ["Sprechen", 64, "gold"],
              ].map(([skill, v, tone]) => (
                <div key={skill as string} className="grid grid-cols-[80px_1fr_36px] items-center gap-3 text-[13px]">
                  <span className="text-muted-foreground">{skill}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className={`block h-full rounded-full ${tone === "gold" ? "bg-gold" : "bg-ink"}`}
                      style={{ width: `${v}%` }}
                    />
                  </span>
                  <span className="text-right font-semibold">{v}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-foreground/10 bg-ink-foreground/5 px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Brief an die Vermieterin</p>
              <p className="text-[13px] text-ink-foreground/70">AI estimate 14/20 · checked in 2 min</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
              <CheckCircle2 className="size-3.5" />
              Teacher reviewed
            </span>
          </div>
        </div>
      </div>

      <p className="max-w-sm text-[15px] text-ink-foreground/75">
        Daily practice, writing feedback in minutes and timed mock exams — confirmed by your academy teacher.
      </p>
    </aside>
  );
}

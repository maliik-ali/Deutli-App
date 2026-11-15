"use client";

import { Trophy } from "lucide-react";

import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";

export type Tier = { title: string; line: string };
export function tierFor(pct: number, skipped = false, left = 0): Tier {
  if (skipped) return { title: "It looks like you skipped a lot", line: `${left} questions were left empty. A guess is always better than a blank: every answer teaches you something. Try again and give each question a go.` };
  if (pct >= 0.9) return { title: "Outstanding!", line: "That is a top-level result. You are ready for the real exam." };
  if (pct >= 0.75) return { title: "Great work!", line: "You are clearly above the pass line. Keep this rhythm going." };
  if (pct >= 0.6) return { title: "You passed this part", line: "Nice. A little more practice will make it even safer." };
  return { title: "Good effort", line: "You gave it a real try, and that is how you improve. Check your mistakes below, then try again. You will do better." };
}

const R = 70;
const C = 2 * Math.PI * R;

/** The big score card: a ring that fills, the number counting up, and a short message. */
export function ScoreHero({ total, max, passLine, caption, skipped = false, left = 0, skills = [] }: { total: number; max: number; passLine: number; caption: string; skipped?: boolean; left?: number; skills?: { label: string; got: number; max: number }[] }) {
  const pct = max ? total / max : 0;
  const tier = tierFor(pct, skipped, left);
  const passAngle = (passLine / max) * 360;
  return (
    <section aria-label="Your score" className="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative grid items-center gap-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8">
        <div className="relative mx-auto size-[200px]">
          <svg viewBox="0 0 160 160" className="size-full -rotate-90" role="img" aria-label={`${total} of ${max} points`}>
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7f25fb" />
                <stop offset="100%" stopColor="#cb3cff" />
              </linearGradient>
            </defs>
            <circle cx="80" cy="80" r={R} fill="none" strokeWidth="12" className="stroke-muted" />
            <circle cx="80" cy="80" r={R} fill="none" strokeWidth="12" strokeLinecap="round" stroke="url(#ring)" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, pct))} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)" }} />
            <line x1="80" y1="2" x2="80" y2="20" strokeWidth="3" className="stroke-foreground" transform={`rotate(${passAngle} 80 80)`} />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <p className="text-4xl font-extrabold tabular-nums">
              <NumberTicker value={total} decimalPlaces={total % 1 ? 1 : 0} />
            </p>
            <p className="text-[13px] text-muted-foreground">of {max} points</p>
          </div>
        </div>
        <div className="grid gap-2 text-center sm:text-left">
          <p className="flex items-center justify-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-gold-ink uppercase sm:justify-start">
            <Trophy className="size-4" aria-hidden /> {Math.round(pct * 100)}%
          </p>
          <h1 className="text-[30px] leading-tight font-extrabold sm:text-[36px]">{tier.title}</h1>
          <p className="text-muted-foreground">{tier.line}</p>
          <p className="text-[13px] text-subtle-foreground">{caption}</p>
          {skills.length > 0 && (
            <ul className="mt-2 grid gap-2.5 text-left sm:grid-cols-3 sm:gap-4">
              {skills.map((k) => (
                <li key={k.label} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="text-muted-foreground">{k.label}</span>
                    <span className="font-semibold tabular-nums">
                      {k.got}/{k.max}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
                    <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${k.max ? Math.round((k.got / k.max) * 100) : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <BorderBeam size={120} duration={9} colorFrom="#7f25fb" colorTo="#cb3cff" />
    </section>
  );
}

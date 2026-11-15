"use client";

import { Award, CheckCircle2, Flame, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { BorderBeam } from "@/components/magicui/border-beam";
import { MotionProvider } from "@/components/magicui/motion-provider";
import { NumberTicker } from "@/components/magicui/number-ticker";

const SKILLS = [
  { name: "Lesen", v: 84 },
  { name: "Sprachbausteine", v: 72 },
  { name: "Hören", v: 76 },
];

const rise = (delay: number) => ({ initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const } });
const float = (d: number, delay = 0) => ({ animate: { y: [0, -d, 0] }, transition: { duration: 6, delay, repeat: Infinity, ease: "easeInOut" as const } });

/**
 * A moving preview of the Deutli dashboard for the login and signup pages.
 * It shows sample figures to explain the product (the caption says so), not a real student's data.
 */
export function AuthShowcase() {
  return (
    <MotionProvider>
      <div className="relative mx-auto w-full max-w-[560px]">
        <motion.div {...rise(0.1)} className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0a1230] shadow-2xl shadow-black/50">
          {/* window bar */}
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3" aria-hidden>
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="ml-3 rounded-full bg-white/5 px-3 py-0.5 text-[11px] text-white/50">app.deutli.com/dashboard</span>
          </div>

          <div className="grid gap-4 p-5">
            <motion.div {...rise(0.3)} className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[19px] font-extrabold">Guten Tag, Ayesha</p>
                <p className="text-[12px] text-white/55">Preparing for telc Deutsch B1</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[12px] font-semibold">
                <Flame className="size-3.5 text-gold-ink" aria-hidden /> Streak
              </span>
            </motion.div>

            <div className="grid grid-cols-[1.1fr_1fr] gap-4">
              {/* readiness */}
              <motion.div {...rise(0.45)} className="relative grid gap-3 rounded-2xl border border-white/10 bg-[#0e1a40] p-4">
                <BorderBeam size={90} duration={9} colorFrom="#7f25fb" colorTo="#cb3cff" />
                <p className="text-[12px] font-semibold text-white/70">B1 readiness</p>
                <p className="flex items-baseline gap-1">
                  <span className="font-heading text-[40px] leading-none font-extrabold">
                    <NumberTicker value={68} delay={0.8} />%
                  </span>
                  <span className="text-[11px] text-white/50">ready</span>
                </p>
                <ul className="grid gap-2.5">
                  {SKILLS.map((s, i) => (
                    <li key={s.name} className="grid gap-1">
                      <div className="flex justify-between text-[11px] text-white/70">
                        <span>{s.name}</span>
                        <span className="font-semibold">{s.v}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-[#7f25fb] to-[#cb3cff]" style={{ width: `${s.v}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.1, delay: 0.9 + i * 0.15, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* writing feedback */}
              <motion.div {...rise(0.6)} className="grid content-start gap-3 rounded-2xl border border-white/10 bg-[#0e1a40] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-white/70">Writing feedback</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold-ink">
                    <Sparkles className="size-3" aria-hidden /> AI
                  </span>
                </div>
                <p className="flex items-baseline gap-1.5">
                  <span className="font-heading text-[32px] leading-none font-extrabold">
                    <NumberTicker value={38} delay={1.1} />
                  </span>
                  <span className="text-[11px] text-white/50">of 45 · estimate</span>
                </p>
                <div className="grid gap-1.5 text-[11px]" lang="de">
                  <motion.span {...rise(1.5)} className="w-fit rounded-md bg-destructive-soft px-2 py-0.5 text-destructive line-through">
                    weil ich habe keine Zeit
                  </motion.span>
                  <motion.span {...rise(1.8)} className="w-fit rounded-md bg-success-soft px-2 py-0.5 font-medium text-success">
                    weil ich keine Zeit habe
                  </motion.span>
                </div>
              </motion.div>
            </div>

            {/* certificate peek */}
            <motion.div {...rise(0.9)} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0e1a40] p-4">
              <div className="grid h-16 w-12 shrink-0 place-content-center rounded-md bg-[#fbfaf7] text-center text-neutral-800" aria-hidden>
                <span className="text-[7px] tracking-wider text-neutral-500">ZERTIFIKAT</span>
                <span className="text-[15px] font-bold text-[#7f25fb]">B1</span>
              </div>
              <div className="grid gap-0.5">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Award className="size-4 text-gold-ink" aria-hidden /> Your practice certificate
                </p>
                <p className="text-[11px] text-white/55">Your name and real scores, just like the real exam.</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* floating chips */}
        <motion.div {...float(8)} className="absolute -top-4 -right-3 sm:-right-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#12245c] px-3 py-1.5 text-[12px] font-semibold shadow-lg shadow-black/40">
            <CheckCircle2 className="size-4 text-success" aria-hidden /> Teacher reviewed
          </span>
        </motion.div>
        <motion.div {...float(10, 1.5)} className="absolute -bottom-5 -left-3 sm:-left-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#12245c] px-3 py-1.5 text-[12px] font-semibold shadow-lg shadow-black/40">
            <Sparkles className="size-4 text-gold-ink" aria-hidden /> AI feedback in seconds
          </span>
        </motion.div>

        <p className="mt-12 text-center text-[11px] text-white/40">Preview with sample figures.</p>
      </div>
    </MotionProvider>
  );
}

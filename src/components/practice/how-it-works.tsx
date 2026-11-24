"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

import { BorderBeam } from "@/components/magicui/border-beam";
import { MotionProvider } from "@/components/magicui/motion-provider";
import { Card, CardTitle } from "@/components/ui/card";

/**
 * "Three rounds with every text" as a numbered timeline: numbered circles joined by a line
 * that draws itself, steps that light up one after another, and one slow gradient light around the card.
 */
export function HowItWorksCard({ steps }: { steps: { title: string; body: string }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const seen = useInView(ref, { once: true, margin: "-60px" });
  return (
    <MotionProvider>
      <Card className="relative border-ink bg-ink text-ink-foreground">
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] motion-reduce:hidden">
          <BorderBeam size={150} duration={9} colorFrom="#7f25fb" colorTo="#00c2ff" borderWidth={1.5} />
        </div>
        <div className="grid gap-1">
          <p className="text-[13px] font-medium text-gold-ink">How it works</p>
          <CardTitle className="text-xl text-ink-foreground">Three rounds with every text</CardTitle>
        </div>
        <ol ref={ref} className="grid gap-7 pt-1">
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4"
              initial={{ opacity: 0.25, y: 10 }}
              animate={seen ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.5, delay: 0.25 + i * 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* line down to the next step */}
              {i < steps.length - 1 && (
                <motion.span
                  aria-hidden
                  className="absolute top-10 left-5 -ml-px h-[calc(100%-1rem+0.75rem)] w-0.5 origin-top bg-gradient-to-b from-[#7f25fb] to-[#00c2ff]"
                  initial={{ scaleY: 0 }}
                  animate={seen ? { scaleY: 1 } : undefined}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.35 }}
                />
              )}
              <span className="relative z-10 grid size-10 place-items-center rounded-full border border-border bg-card text-[13px] font-bold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <div className="grid gap-1 pt-0.5">
                <p className="text-[19px] leading-tight font-bold">{s.title}</p>
                <p className="text-[14px] text-ink-foreground/70">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </Card>
    </MotionProvider>
  );
}

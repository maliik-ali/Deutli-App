"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";

const COLORS = ["#7161ff", "#cb3cff", "#00c2ff", "#ffffff", "#a79fff"];
// Same "random" every time, so rendering stays predictable.
const rnd = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7L2 9.2l7.1-.6z" fill={color} />
    </svg>
  );
}

/**
 * Stars and confetti fall from the top once, for a good result. Plays one time per attempt,
 * is skipped for people who prefer reduced motion, and never blocks taps.
 * level 1 = passed, level 2 = excellent (more of it).
 */
export function Celebration({ attemptId, level }: { attemptId: string; level: 1 | 2 }) {
  const key = `deutli-celebrated-${attemptId}`;
  const played = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(key) === "1" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch {
        return true;
      }
    },
    () => true,
  );
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (played) return;
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setDone(true), 5200);
    return () => clearTimeout(t);
  }, [played, key]);

  if (played || done) return null;
  const count = level === 2 ? 46 : 26;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const star = i % 3 !== 2;
        const size = star ? 14 + rnd(i, 1) * 20 : 6 + rnd(i, 1) * 6;
        const color = COLORS[i % COLORS.length];
        return (
          <motion.span
            key={i}
            className="absolute top-0 block"
            style={{ left: `${rnd(i, 2) * 100}%` }}
            initial={{ y: "-12vh", opacity: 0, rotate: 0 }}
            animate={{ y: "108vh", opacity: [0, 1, 1, 0.9], rotate: (rnd(i, 3) - 0.5) * 540, x: [0, (rnd(i, 4) - 0.5) * 80, (rnd(i, 5) - 0.5) * 80] }}
            transition={{ duration: 2.6 + rnd(i, 6) * 1.8, delay: rnd(i, 7) * 1.1, ease: "easeIn" }}
          >
            {star ? <Star size={size} color={color} /> : <span className="block rounded-[2px]" style={{ width: size, height: size * 1.6, background: color }} />}
          </motion.span>
        );
      })}
    </div>
  );
}

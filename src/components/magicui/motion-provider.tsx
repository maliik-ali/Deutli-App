"use client";

import { MotionConfig } from "motion/react";

/** People who ask their device for less motion get no movement animations (opacity changes stay). */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

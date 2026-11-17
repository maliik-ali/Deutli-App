import { BookOpen, CircleHelp, Headphones, Mic, PenLine, Puzzle, type LucideIcon } from "lucide-react";

import type { SkillId } from "@/lib/onboarding/options";

/** Icon for each exam worry (onboarding and the dashboard "Your focus" card). */
export const SKILL_ICONS: Record<SkillId, LucideIcon> = {
  lesen: BookOpen,
  sprachbausteine: Puzzle,
  hoeren: Headphones,
  schreiben: PenLine,
  sprechen: Mic,
  unsure: CircleHelp,
};

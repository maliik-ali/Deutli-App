import { BookOpen, Headphones, Mic, PenLine, type LucideIcon } from "lucide-react";

import type { SkillSlug } from "@/lib/exam/catalog";

export const SKILL_ICONS: Record<SkillSlug, LucideIcon> = {
  reading: BookOpen,
  listening: Headphones,
  writing: PenLine,
  speaking: Mic,
};

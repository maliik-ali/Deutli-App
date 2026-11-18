/** Labels and small helpers for live classes. Safe to use in server and client code. */

export const SKILLS = [
  { id: "general", label: "General" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing", label: "Writing" },
  { id: "speaking", label: "Speaking" },
  { id: "grammar", label: "Grammar" },
  { id: "vocabulary", label: "Vocabulary" },
] as const;
export type SkillId = (typeof SKILLS)[number]["id"];
export const SKILL_IDS = SKILLS.map((s) => s.id) as [SkillId, ...SkillId[]];
/** What a teacher can say they are good at (everything except "General"). */
export const SPECIALTIES = SKILLS.filter((s) => s.id !== "general");

export const LEVELS = [
  { id: "all", label: "All levels" },
  { id: "a1", label: "A1" },
  { id: "a2", label: "A2" },
  { id: "b1", label: "B1" },
  { id: "b2", label: "B2" },
] as const;
export type LevelId = (typeof LEVELS)[number]["id"];
export const LEVEL_IDS = LEVELS.map((l) => l.id) as [LevelId, ...LevelId[]];

export const DURATIONS = [30, 45, 60, 75, 90, 120] as const;
export const REPEAT_OPTIONS = [1, 2, 3, 4, 6, 8, 12] as const;

export const skillLabel = (id: string) => SKILLS.find((s) => s.id === id)?.label ?? "General";
export const levelLabel = (id: string) => LEVELS.find((l) => l.id === id)?.label ?? "All levels";

/** The join button opens this many minutes before the class starts. */
export const JOIN_OPENS_MIN = 10;
/** …and stays open this many minutes after it should have ended (classes run over). */
export const JOIN_GRACE_MIN = 15;

export type Phase = "upcoming" | "soon" | "live" | "ended";

export function classPhase(startsAt: string | Date, durationMin: number, now: number = Date.now()): Phase {
  const start = new Date(startsAt).getTime();
  const end = start + durationMin * 60_000;
  if (now >= end) return "ended";
  if (now >= start) return "live";
  if (now >= start - JOIN_OPENS_MIN * 60_000) return "soon";
  return "upcoming";
}

/** "3 seats left", "Full" or null (no limit). */
export function seatsText(capacity: number | null, taken: number): { text: string; full: boolean } | null {
  if (capacity == null) return null;
  const left = Math.max(0, capacity - taken);
  if (left === 0) return { text: "Full", full: true };
  return { text: left === 1 ? "1 seat left" : `${left} seats left`, full: false };
}

/** "10:30 – 11:30" style end time helper: minutes → "60 min" or "1 h 30 min". */
export function durationText(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** 15-minute time slots for the class form: value "10:30", label "10:30 AM". */
export const TIME_SLOTS: { value: string; label: string }[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { value, label: `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}` };
});

/** Only show an average once enough students rated, so one vote never looks like a verdict. */
export const MIN_RATINGS_TO_SHOW = 3;

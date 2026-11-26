/** What helped the student: a short fixed list, so reviews say something useful and can be compared. */
export const HELPED = [
  { id: "clear", label: "Clear explanations" },
  { id: "patient", label: "Patient with questions" },
  { id: "exam", label: "Helped me prepare for the exam" },
  { id: "speaking", label: "Good speaking practice" },
  { id: "organised", label: "Well organised classes" },
] as const;
export const HELPED_IDS = HELPED.map((h) => h.id) as [string, ...string[]];

export const REPORT_REASONS = [
  { id: "fake", label: "It looks fake" },
  { id: "offensive", label: "Offensive or unfair" },
  { id: "spam", label: "Spam or advertising" },
  { id: "other", label: "Something else" },
] as const;
export const REPORT_REASON_IDS = REPORT_REASONS.map((r) => r.id) as ["fake", "offensive", "spam", "other"];

/** An average is shown from this many reviews on (fewer would be one person's opinion). */
export const MIN_REVIEWS_FOR_AVERAGE = 3;
/** A student counts as verified after this many days in the teacher's batch (or after attending one class). */
export const MIN_DAYS_IN_BATCH = 14;

/** "Ayesha Khan" becomes "Ayesha K.": enough to feel real, not enough to find a person. */
export function shortName(full: string | null | undefined): string {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A student";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

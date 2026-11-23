import type { CertScores } from "@/components/exam/practice-certificate";
import { SECTIONS, sectionsInStructure, type AttemptResult, type PaperStructure } from "./template";

type ReviewLike = { status: string; total: number | null } | null;
type FeedbackLike = { total: number } | null;

/** Points per skill from a finished attempt. */
export function sectionPoints(structure: PaperStructure, r: AttemptResult, section: string) {
  const ids = structure.parts.filter((p) => p.section === section).map((p) => p.id);
  const rows = r.parts.filter((x) => ids.includes(x.id));
  return { got: rows.reduce((a, x) => a + x.points, 0), max: rows.reduce((a, x) => a + x.max, 0) };
}

/** What goes on the practice certificate: the real scores, writing from the teacher (if marked) or the AI estimate. */
export function certScores(opts: { name: string | null; title: string; structure: PaperStructure; result: AttemptResult; date: string; review: ReviewLike; feedback: FeedbackLike }): CertScores {
  const { structure: st, result: r, review, feedback } = opts;
  const teacher = review?.status === "done" && review.total != null;
  return {
    name: opts.name ?? "Your name",
    examTitle: opts.title,
    date: opts.date,
    lesen: sectionPoints(st, r, "lesen"),
    sprach: sectionPoints(st, r, "sprachbausteine"),
    hoeren: sectionPoints(st, r, "hoeren"),
    hasWriting: st.parts.some((p) => p.section === "schreiben"),
    full: sectionsInStructure(st).length === SECTIONS.length,
    writing: teacher ? review.total : (feedback?.total ?? null),
    writingBy: teacher ? "teacher" : feedback ? "ai" : null,
  };
}

export const certDate = (iso: string, timeZone: string) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone });

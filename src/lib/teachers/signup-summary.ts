import { EXAMS, STUDENT_COUNTS, TOOLS, WANTS } from "./signup-options";

export type SignupRow = {
  account_type: string;
  exams: string[];
  levels: string[];
  student_count: string | null;
  tools: string[];
  wants: string[];
};

const label = (list: readonly { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id;

/** One plain line for the admin: what a self-signed teacher or school told us. */
export function signupSummary(r: SignupRow): string {
  const parts = [
    r.account_type === "school" ? "runs a school" : "teaches on their own",
    r.exams.length ? r.exams.map((x) => label(EXAMS, x)).join(", ") : null,
    r.levels.length ? r.levels.join(", ") : null,
    r.student_count ? `${label(STUDENT_COUNTS, r.student_count)} students now` : null,
    r.tools.length ? `uses ${r.tools.map((x) => label(TOOLS, x)).join(", ")}` : null,
    r.wants.length ? `wants ${r.wants.map((x) => label(WANTS, x)).join(", ")}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}
